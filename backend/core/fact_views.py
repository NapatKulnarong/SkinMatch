"""
Facts API views for SkinMatch
Handles topic listing, detail views, and personalized recommendations
"""

from django.db.models import Q, Count, Prefetch
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.core.cache import cache
from collections import defaultdict
import logging

from .models import SkinFactTopic, SkinFactView, SkinFactContentBlock
from .auth import decode_token

# Import quiz models to access user's quiz responses
try:
    from quiz.models import QuizSession, QuizAnswer, QuizQuestion, QuizChoice
except ImportError:
    QuizSession = None
    QuizAnswer = None
    QuizQuestion = None
    QuizChoice = None

logger = logging.getLogger(__name__)


def get_user_from_request(request):
    """Extract user from JWT token in Authorization header"""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None
    
    token = auth_header[7:]  # Remove 'Bearer ' prefix
    try:
        payload = decode_token(token)
        if payload:
            user_id = payload.get('user_id')
            if user_id:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                return User.objects.filter(id=user_id).first()
    except Exception as e:
        logger.warning(f"Failed to decode token: {e}")
    
    return None


@csrf_exempt
@require_http_methods(["GET"])
def recommended_topics(request):
    """
    GET /api/facts/topics/recommended
    
    Returns personalized topic recommendations based on:
    - User's COMPLETED quiz session only
    
    Query params:
    - limit: number of topics to return (default: 4)
    - session_id: quiz session ID for anonymous users
    """
    try:
        limit = int(request.GET.get('limit', 4))
        session_id = request.GET.get('session_id')
        
        # Try to get authenticated user
        user = get_user_from_request(request)
        
        logger.info(f"[recommended_topics] user={user}, session_id={session_id}, limit={limit}")
        
        # Get personalized recommendations
        topics = get_personalized_recommendations(
            user=user,
            session_id=session_id,
            limit=limit
        )
        
        # Serialize topics
        data = [serialize_topic_summary(topic) for topic in topics]
        
        return JsonResponse(data, safe=False)
        
    except Exception as e:
        logger.error(f"Error in recommended_topics: {e}", exc_info=True)
        return JsonResponse({'error': 'Failed to load recommendations'}, status=500)


def get_personalized_recommendations(user=None, session_id=None, limit=4):
    """
    Core recommendation logic based ONLY on completed quiz sessions:
    1. Check if user has a completed quiz (finalized session)
    2. If yes, score topics based on quiz answers
    3. If no, return empty list (frontend will show fallback)
    
    Section diversity is maintained (max 2 per section).
    """
    
    # Get base queryset of published topics
    base_topics = SkinFactTopic.objects.filter(is_published=True).select_related()
    
    # Get user's quiz answers from COMPLETED session only
    quiz_concerns, is_completed = get_user_quiz_concerns(user, session_id)
    
    logger.info(f"[recommendations] Quiz completed: {is_completed}, concerns: {quiz_concerns}")
    
    # If no completed quiz, return empty list
    if not is_completed or not quiz_concerns:
        logger.info("[recommendations] No completed quiz found, returning empty list")
        return []
    
    # Build scoring system based purely on quiz match
    topic_scores = defaultdict(float)
    
    # Score topics based on quiz answers
    for topic in base_topics:
        score = calculate_quiz_match_score(topic, quiz_concerns)
        if score > 0:
            topic_scores[topic.id] = score
    
    # If no topics scored, return empty
    if not topic_scores:
        logger.info("[recommendations] No topics matched quiz concerns")
        return []
    
    # Sort topics by score
    scored_topics = sorted(
        [(tid, score) for tid, score in topic_scores.items()],
        key=lambda x: x[1],
        reverse=True
    )
    
    logger.info(f"[recommendations] Top scored topics: {scored_topics[:10]}")
    
    # Select topics with section diversity (max 2 per section)
    section_counts = defaultdict(int)
    selected_ids = []
    
    for topic_id, score in scored_topics:
        topic = base_topics.filter(id=topic_id).first()
        if not topic:
            continue
        
        # Limit topics per section to maintain diversity
        if section_counts[topic.section] >= 2:
            continue
        
        selected_ids.append(topic_id)
        section_counts[topic.section] += 1
        
        if len(selected_ids) >= limit:
            break
    
    # If we still don't have enough after section limits, add more regardless of section
    if len(selected_ids) < limit:
        for topic_id, score in scored_topics:
            if topic_id not in selected_ids:
                selected_ids.append(topic_id)
                if len(selected_ids) >= limit:
                    break
    
    # Fetch and return selected topics
    topics = base_topics.filter(id__in=selected_ids)
    
    # Maintain order by score
    topic_dict = {t.id: t for t in topics}
    ordered_topics = [topic_dict[tid] for tid in selected_ids if tid in topic_dict]
    
    logger.info(f"[recommendations] Returning {len(ordered_topics)} topics: {[t.title for t in ordered_topics]}")
    
    return ordered_topics


def get_user_quiz_concerns(user=None, session_id=None):
    """
    Extract user concerns from their COMPLETED quiz session.
    Returns tuple: (concerns_dict, is_completed)
    
    - concerns_dict: contains main_concern, secondary_concern, skin_type, etc.
    - is_completed: True only if the session is finalized/completed
    """
    if not QuizSession or not QuizAnswer:
        return {}, False
    
    # Get the latest COMPLETED quiz session
    quiz_session = None
    
    if user and user.is_authenticated:
        # For authenticated users, get their latest FINALIZED session
        quiz_session = QuizSession.objects.filter(
            user=user,
            is_completed=True  # Only completed sessions
        ).order_by('-updated_at').first()
        
        logger.info(f"[get_user_quiz_concerns] Logged-in user {user.id}, found session: {quiz_session}")
        
    elif session_id:
        # For anonymous users, check if provided session is completed
        quiz_session = QuizSession.objects.filter(
            session_id=session_id,
            is_completed=True  # Only completed sessions
        ).first()
        
        logger.info(f"[get_user_quiz_concerns] Anonymous session {session_id}, found: {quiz_session}")
    
    if not quiz_session:
        logger.info("[get_user_quiz_concerns] No completed quiz session found")
        return {}, False
    
    # Get all answers for this session
    answers = QuizAnswer.objects.filter(
        session=quiz_session
    ).select_related('question', 'choice')
    
    if not answers.exists():
        logger.info(f"[get_user_quiz_concerns] Session {quiz_session.session_id} has no answers")
        return {}, False
    
    concerns = {}
    for answer in answers:
        question_key = answer.question.key
        choice_value = answer.choice.value if answer.choice else None
        choice_label = answer.choice.label if answer.choice else None
        
        concerns[question_key] = {
            'value': choice_value,
            'label': choice_label
        }
    
    logger.info(f"[get_user_quiz_concerns] Session {quiz_session.session_id} is completed with concerns: {concerns}")
    
    return concerns, True


def calculate_quiz_match_score(topic, quiz_concerns):
    """
    Calculate how well a topic matches the user's quiz concerns
    Returns a score (0-10)
    """
    score = 0.0
    
    # Get topic content for matching
    title = topic.title.lower()
    subtitle = (topic.subtitle or '').lower()
    excerpt = (topic.excerpt or '').lower()
    slug = topic.slug.lower()
    
    content = f"{title} {subtitle} {excerpt} {slug}"
    
    # Match main concern (highest weight: 5 points)
    main_concern = quiz_concerns.get('main_concern', {})
    if main_concern:
        concern_value = (main_concern.get('value') or '').lower()
        concern_label = (main_concern.get('label') or '').lower()
        
        if concern_value in content or concern_label in content:
            score += 5.0
    
    # Match secondary concern (weight: 3 points)
    secondary_concern = quiz_concerns.get('secondary_concern', {})
    if secondary_concern:
        concern_value = (secondary_concern.get('value') or '').lower()
        concern_label = (secondary_concern.get('label') or '').lower()
        
        if concern_value in content or concern_label in content:
            score += 3.0
    
    # Match skin type (weight: 2 points)
    skin_type = quiz_concerns.get('skin_type', {})
    if skin_type:
        type_value = (skin_type.get('value') or '').lower()
        type_label = (skin_type.get('label') or '').lower()
        
        if type_value in content or type_label in content:
            score += 2.0
    
    # Match sensitivity (weight: 2 points)
    sensitivity = quiz_concerns.get('sensitivity', {})
    if sensitivity:
        sens_value = (sensitivity.get('value') or '').lower()
        sens_label = (sensitivity.get('label') or '').lower()
        
        if sens_value in content or sens_label in content:
            score += 2.0
    
    # Special keyword matching
    keywords = {
        'acne': ['acne', 'pimple', 'breakout', 'bha', 'salicylic'],
        'aging': ['aging', 'wrinkle', 'retinol', 'retinoid', 'collagen'],
        'hyperpigmentation': ['dark spot', 'pigment', 'brightening', 'vitamin c', 'niacinamide'],
        'hydration': ['dry', 'hydrat', 'moistur', 'hyaluronic'],
        'sensitivity': ['sensitive', 'irritat', 'calming', 'soothing', 'cica'],
    }
    
    for concern_key, terms in keywords.items():
        concern_data = quiz_concerns.get('main_concern', {})
        concern_value = (concern_data.get('value') or '').lower()
        
        if concern_key in concern_value:
            for term in terms:
                if term in content:
                    score += 1.0
                    break
    
    return score


def serialize_topic_summary(topic):
    """Serialize a SkinFactTopic for API response"""
    return {
        'id': str(topic.id),
        'slug': topic.slug,
        'title': topic.title,
        'subtitle': topic.subtitle,
        'excerpt': topic.excerpt,
        'section': topic.section,
        'hero_image_url': topic.hero_image.url if topic.hero_image else None,
        'hero_image_alt': topic.hero_image_alt,
        'view_count': topic.view_count or 0,
    }


# Additional helper views you might need

@csrf_exempt
@require_http_methods(["GET"])
def popular_topics(request):
    """Get most popular topics across all sections"""
    try:
        limit = int(request.GET.get('limit', 5))
        
        topics = SkinFactTopic.objects.filter(
            is_published=True
        ).order_by('-view_count')[:limit]
        
        data = [serialize_topic_summary(topic) for topic in topics]
        return JsonResponse(data, safe=False)
        
    except Exception as e:
        logger.error(f"Error in popular_topics: {e}", exc_info=True)
        return JsonResponse({'error': 'Failed to load topics'}, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def topics_by_section(request, section):
    """
    Get topics for a specific section.
    If user has a completed quiz, topics are ordered by relevance.
    Otherwise, ordered by popularity (view_count).
    """
    try:
        limit = int(request.GET.get('limit', 6))
        offset = int(request.GET.get('offset', 0))
        session_id = request.GET.get('session_id')
        
        user = get_user_from_request(request)
        
        # Base queryset
        topics = SkinFactTopic.objects.filter(
            is_published=True,
            section=section
        )
        
        # If user has completed quiz, try to order by relevance
        if user or session_id:
            quiz_concerns, is_completed = get_user_quiz_concerns(user, session_id)
            
            if is_completed and quiz_concerns:
                # Score and sort topics by quiz match
                topic_scores = []
                for topic in topics:
                    score = calculate_quiz_match_score(topic, quiz_concerns)
                    topic_scores.append((topic, score))
                
                # Sort by score descending, then by view count
                topic_scores.sort(key=lambda x: (x[1], x[0].view_count or 0), reverse=True)
                topics = [t[0] for t in topic_scores]
            else:
                # No completed quiz: order by view count
                topics = topics.order_by('-view_count')
        else:
            # No user/session: order by view count
            topics = topics.order_by('-view_count')
        
        # Apply pagination
        topics = topics[offset:offset + limit]
        
        data = [serialize_topic_summary(topic) for topic in topics]
        return JsonResponse(data, safe=False)
        
    except Exception as e:
        logger.error(f"Error in topics_by_section: {e}", exc_info=True)
        return JsonResponse({'error': 'Failed to load topics'}, status=500)
        