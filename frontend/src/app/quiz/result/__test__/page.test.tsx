import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { ComponentProps } from 'react';
import QuizResultPage from '../page';

// --- Mocks ---
// ✅ Mock next/image
jest.mock('next/image', () => {
  const Img = (props: ComponentProps<'img'>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...props} />
  );
  return {
    __esModule: true,
    default: Img,
  };
});

// ✅ Mock next/link
jest.mock('next/link', () => {
  const Link = ({
    children,
    href,
    ...props
  }: { children: React.ReactNode; href: string } & ComponentProps<'a'>) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
  return {
    __esModule: true,
    default: Link,
  };
});

// Router mock
const pushMock = jest.fn() as jest.Mock<void, [string]>;
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

// NavWidth mock
jest.mock('@/components/NavWidthContext', () => ({
  useNavWidth: () => 1024,
}));

// Quiz context mock
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
          Cleanser: 2,
          Serum: 3,
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

// API mock
jest.mock('@/lib/api.quiz', () => ({
  emailQuizSummary: jest.fn().mockResolvedValue(undefined),
}));

// --- Tests ---
describe('QuizResultPage', () => {
  beforeEach(() => {
    pushMock.mockClear();
    mockResetQuiz.mockClear();
    mockFinalize.mockClear();
  });

  it('renders result UI and shows quiz answers', async () => {
    render(<QuizResultPage />);

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

    expect(screen.getByText('Acne')).toBeInTheDocument();
    expect(screen.getByText('Oily')).toBeInTheDocument();
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