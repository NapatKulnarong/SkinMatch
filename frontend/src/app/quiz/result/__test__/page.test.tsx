import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import QuizResultPage from '../page';

// Mock the Quiz context so the page has answers and is complete
jest.mock('../../_QuizContext', () => ({
  useQuiz: () => ({
    answers: { primaryConcern: 'acne', skinType: 'oily' },
    resetQuiz: jest.fn(),
    isComplete: true,
  }),
}));

// Mock NavWidth context for stable desktop layout during tests
jest.mock('@/components/NavWidthContext', () => ({
  useNavWidth: () => 1024,
}));

// Capture router.push so we can assert it
const pushMock = jest.fn();

// Mock Next.js router exactly once
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: jest.fn(), back: jest.fn() }),
}));

describe('QuizResultPage', () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it('renders result UI and shows quiz answers', async () => {
    render(<QuizResultPage />);

    expect(
      await screen.findByRole('heading', { name: /personalised routine roadmap/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', { name: /your skin profile/i, level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /ingredients to prioritise/i, level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /use with caution/i })
    ).toBeInTheDocument();

    // Answers from QuizContext should render
    expect(screen.getByText(/acne/i)).toBeInTheDocument();
    expect(screen.getByText(/oily/i)).toBeInTheDocument();
    
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });

  it('navigates to /quiz when "Retake the quiz" is clicked', async () => {
    render(<QuizResultPage />);

    const btn = screen.getByRole('button', { name: /retake the quiz/i });
    await userEvent.click(btn);

    expect(pushMock).toHaveBeenCalledWith('/quiz');
  });
});
