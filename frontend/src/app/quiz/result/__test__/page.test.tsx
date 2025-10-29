import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import QuizResultPage from '../page';

// Mock Next.js modules
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => {
    return <a href={href} {...props}>{children}</a>;
  },
}));

// Capture router.push so we can assert it
const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ 
    push: pushMock, 
    replace: jest.fn(), 
    back: jest.fn() 
  }),
}));

// Mock NavWidth context for stable desktop layout during tests
jest.mock('@/components/NavWidthContext', () => ({
  useNavWidth: () => 1024,
}));

// Mock the Quiz context with complete data
const mockFinalize = jest.fn();
const mockResetQuiz = jest.fn().mockResolvedValue(undefined);

jest.mock('../../_QuizContext', () => ({
  useQuiz: () => ({
    answers: {
      primaryConcern: { label: 'Acne', value: 'acne' },
      secondaryConcern: null,
      eyeConcern: { label: 'Dark circles', value: 'dark-circles' },
      skinType: { label: 'Oily', value: 'oily' },
      sensitivity: { label: 'Normal', value: 'normal' },
      pregnancy: { label: 'No', value: 'no' },
      budget: { label: 'Mid-range', value: 'mid' },
    },
    resetQuiz: mockResetQuiz,
    isComplete: true,
    result: {
      sessionId: 'test-session-123',
      profile: {
        primaryConcerns: ['Acne'],
        secondaryConcerns: [],
        eyeAreaConcerns: ['Dark circles'],
        skinType: 'Oily',
        sensitivity: 'Normal',
        pregnantOrBreastfeeding: false,
        budget: 'mid',
      },
      summary: {
        primaryConcerns: ['Acne'],
        topIngredients: ['Salicylic Acid', 'Niacinamide', 'Tea Tree Oil'],
        categoryBreakdown: {
          'Cleanser': 2,
          'Serum': 3,
        },
      },
      strategyNotes: [
        'Focus on oil control and pore refinement.',
        'Use gentle exfoliation 2-3 times per week.',
      ],
      recommendations: [],
      requiresAuth: false,
    },
    finalize: mockFinalize,
    error: null,
  }),
}));

// Mock the API module
jest.mock('@/lib/api.quiz', () => ({
  emailQuizSummary: jest.fn().mockResolvedValue(undefined),
}));

describe('QuizResultPage', () => {
  beforeEach(() => {
    pushMock.mockClear();
    mockResetQuiz.mockClear();
    mockFinalize.mockClear();
  });

  it('renders result UI and shows quiz answers', async () => {
    render(<QuizResultPage />);
    
    // Check main headings
    expect(
      await screen.findByRole('heading', { name: /personalised routine roadmap/i })
    ).toBeInTheDocument();
    
    expect(
      screen.getByRole('heading', { name: /your skin profile/i })
    ).toBeInTheDocument();
    
    expect(
      screen.getByRole('heading', { name: /ingredients to prioritise/i })
    ).toBeInTheDocument();
    
    expect(
      screen.getByRole('heading', { name: /use with caution/i })
    ).toBeInTheDocument();

    // Check that answers are displayed
    expect(screen.getByText('Acne')).toBeInTheDocument();
    expect(screen.getByText('Oily')).toBeInTheDocument();
    
    // Check ingredients are shown
    expect(screen.getByText('Salicylic Acid')).toBeInTheDocument();
    expect(screen.getByText('Niacinamide')).toBeInTheDocument();
  });

  it('navigates to /quiz when "Retake the quiz" is clicked', async () => {
    const user = userEvent.setup();
    render(<QuizResultPage />);
    
    const btn = screen.getByRole('button', { name: /retake the quiz/i });
    await user.click(btn);
    
    expect(mockResetQuiz).toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith('/quiz');
  });
});