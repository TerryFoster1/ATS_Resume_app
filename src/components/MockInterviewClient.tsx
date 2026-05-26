"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ACCOUNT_CREDITS_REFRESH_EVENT } from "@/components/AccountCreditIndicator";
import { trackEvent } from "@/lib/analytics";
import type {
  MockInterviewAnswer,
  MockInterviewFeedbackItem,
  MockInterviewQuestion,
  MockInterviewState
} from "@/lib/mockInterview";

type MockInterviewClientProps = {
  outputId: string;
  title: string;
  companyName?: string | null;
  initialMockInterview: MockInterviewState | null;
};

export default function MockInterviewClient({
  outputId,
  title,
  companyName,
  initialMockInterview
}: MockInterviewClientProps) {
  const [mockInterview, setMockInterview] = useState<MockInterviewState | null>(initialMockInterview);
  const [currentIndex, setCurrentIndex] = useState(() => firstUnansweredIndex(initialMockInterview));
  const [draft, setDraft] = useState(() => {
    const question = initialMockInterview?.questions[firstUnansweredIndex(initialMockInterview)];
    return question ? answerFor(initialMockInterview?.answers ?? [], question.id) : "";
  });
  const [showHint, setShowHint] = useState(false);
  const [busy, setBusy] = useState<"start" | "save" | "finish" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const questions = mockInterview?.questions ?? [];
  const currentQuestion = questions[currentIndex];
  const progress = questions.length ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0;
  const completed = mockInterview?.status === "completed" && mockInterview.feedback;

  async function startInterview() {
    setBusy("start");
    setError(null);
    try {
      const response = await fetch(`/api/outputs/${outputId}/mock-interview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" })
      });
      if (response.status === 402) {
        window.location.href = "/pricing?pack=5&checkout=1";
        return;
      }
      const data = (await response.json().catch(() => ({}))) as {
        mockInterview?: MockInterviewState;
        error?: string;
      };
      if (!response.ok || !data.mockInterview) {
        throw new Error(data.error ?? "Could not start the mock interview.");
      }
      setMockInterview(data.mockInterview);
      const index = firstUnansweredIndex(data.mockInterview);
      setCurrentIndex(index);
      setDraft(answerFor(data.mockInterview.answers, data.mockInterview.questions[index]?.id ?? ""));
      setShowHint(false);
      trackEvent("interview_mock_started", { outputId });
      window.dispatchEvent(new Event(ACCOUNT_CREDITS_REFRESH_EVENT));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the mock interview.");
    } finally {
      setBusy(null);
    }
  }

  async function saveAnswer(nextIndex?: number) {
    if (!mockInterview || !currentQuestion) return false;
    const answer = draft.trim();
    if (!answer) {
      setError("Add an answer before continuing.");
      return false;
    }
    setBusy("save");
    setError(null);
    try {
      const response = await fetch(`/api/outputs/${outputId}/mock-interview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "answer",
          questionId: currentQuestion.id,
          answer
        })
      });
      const data = (await response.json().catch(() => ({}))) as {
        mockInterview?: MockInterviewState;
        error?: string;
      };
      if (!response.ok || !data.mockInterview) {
        throw new Error(data.error ?? "Could not save this answer.");
      }
      setMockInterview(data.mockInterview);
      if (typeof nextIndex === "number") {
        setCurrentIndex(nextIndex);
        setDraft(answerFor(data.mockInterview.answers, data.mockInterview.questions[nextIndex]?.id ?? ""));
        setShowHint(false);
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this answer.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function goToQuestion(index: number) {
    if (!mockInterview || index < 0 || index >= questions.length) return;
    if (draft.trim()) {
      const saved = await saveAnswer(index);
      if (!saved) return;
    } else {
      setCurrentIndex(index);
      setDraft(answerFor(mockInterview.answers, mockInterview.questions[index]?.id ?? ""));
      setShowHint(false);
    }
  }

  async function finishInterview() {
    if (!mockInterview) return;
    if (draft.trim()) {
      const saved = await saveAnswer();
      if (!saved) return;
    }
    setBusy("finish");
    setError(null);
    try {
      const response = await fetch(`/api/outputs/${outputId}/mock-interview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finish" })
      });
      const data = (await response.json().catch(() => ({}))) as {
        mockInterview?: MockInterviewState;
        error?: string;
      };
      if (!response.ok || !data.mockInterview) {
        throw new Error(data.error ?? "Could not generate interview feedback.");
      }
      setMockInterview(data.mockInterview);
      trackEvent("interview_mock_completed", { outputId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate interview feedback.");
    } finally {
      setBusy(null);
    }
  }

  function downloadFeedback() {
    if (!mockInterview?.feedback) return;
    const lines = [
      `${title} - Mock Interview Feedback`,
      "",
      `Overall readiness: ${mockInterview.feedback.readinessLevel}`,
      `Score: ${Math.round(mockInterview.feedback.overallScore)}/100`,
      "",
      "Strengths",
      ...mockInterview.feedback.strengths.map((item) => `- ${item}`),
      "",
      "Risks",
      ...mockInterview.feedback.risks.map((item) => `- ${item}`),
      "",
      "Question Feedback",
      ...mockInterview.feedback.perQuestionFeedback.flatMap((item) => {
        const question = mockInterview.questions.find((entry) => entry.id === item.questionId);
        return [
          "",
          question?.question ?? item.questionId,
          `Score: ${Math.round(item.score)}/100`,
          `What worked: ${item.whatWorked}`,
          `What was missing: ${item.whatWasMissing}`,
          `How to improve: ${item.howToImprove}`,
          `Stronger framing: ${item.strongerFraming}`,
          `STAR: ${item.suggestedSTARStructure.situation} ${item.suggestedSTARStructure.task} ${item.suggestedSTARStructure.action} ${item.suggestedSTARStructure.result}`
        ];
      }),
      "",
      "Final Recommendations",
      ...mockInterview.feedback.finalRecommendations.map((item) => `- ${item}`)
    ];
    triggerDownload(
      new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }),
      `${filenameFromTitle(title)}-mock-interview.txt`
    );
  }

  return (
    <section className="mock-interview-shell">
      <header className="mock-interview-hero">
        <div>
          <p className="app-kicker">Mock interview</p>
          <h1 className="mt-3 app-heading text-3xl sm:text-4xl">
            Practice how you would explain this application.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)] sm:text-base">
            Career Ladder asks one recruiter-style question at a time, saves your answers, and gives
            tactical feedback on clarity, proof, role fit, and stronger STAR framing.
          </p>
        </div>
        <div className="mock-interview-context">
          <span>Application</span>
          <strong>{title}</strong>
          <small>{companyName ?? "Saved application"}</small>
        </div>
      </header>

      {error && (
        <p className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">
          {error}
        </p>
      )}

      {!mockInterview?.questions.length ? (
        <StartPanel busy={busy === "start"} onStart={startInterview} />
      ) : completed ? (
        <ResultsPanel
          mockInterview={mockInterview}
          title={title}
          onDownload={downloadFeedback}
        />
      ) : (
        <section className="mock-interview-stage">
          <div className="mock-question-card">
            <div className="mock-question-topline">
              <span>Question {currentIndex + 1} of {questions.length}</span>
              <span>{currentQuestion.category}</span>
            </div>
            <div className="mock-progress-track" aria-hidden>
              <span style={{ width: `${progress}%` }} />
            </div>
            <h2>{currentQuestion.question}</h2>
            <button
              type="button"
              className="mock-hint-toggle"
              onClick={() => setShowHint((value) => !value)}
            >
              {showHint ? "Hide recruiter focus" : "Show recruiter focus"}
            </button>
            {showHint && (
              <div className="mock-hint-panel">
                <p><strong>Why they ask:</strong> {currentQuestion.whyAsked}</p>
                <p><strong>They are evaluating:</strong> {currentQuestion.evaluationFocus}</p>
              </div>
            )}
          </div>

          <div className="mock-answer-card">
            <label htmlFor="mock-answer">Your answer</label>
            <textarea
              id="mock-answer"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Answer as if you were speaking to a recruiter. Use a real example where possible."
              rows={10}
            />
            <div className="mock-answer-footer">
              <span>{draft.trim().split(/\s+/).filter(Boolean).length} words</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="app-button-ghost px-4 py-2 text-sm"
                  disabled={busy !== null || currentIndex === 0}
                  onClick={() => goToQuestion(currentIndex - 1)}
                >
                  Back
                </button>
                {currentIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    className="app-button-primary px-4 py-2 text-sm"
                    disabled={busy !== null}
                    onClick={() => goToQuestion(currentIndex + 1)}
                  >
                    {busy === "save" ? "Saving..." : "Save and continue"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="app-button-primary px-4 py-2 text-sm"
                    disabled={busy !== null}
                    onClick={finishInterview}
                  >
                    {busy === "finish" ? "Preparing feedback..." : "Finish interview"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/outputs/${outputId}`} className="app-button-ghost px-5 py-2.5 text-sm">
          Back to materials
        </Link>
        <Link href="/dashboard" className="text-sm font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          Dashboard
        </Link>
      </div>
    </section>
  );
}

function StartPanel({
  busy,
  onStart
}: {
  busy: boolean;
  onStart: () => void;
}) {
  return (
    <section className="mock-start-panel">
      <div>
        <p className="app-kicker">Focused practice</p>
        <h2 className="mt-3 app-heading text-2xl">Generate a guided mock interview for 1 credit.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
          The practice set uses your saved resume, cover letter, job posting, and clarification
          answers. You will answer one question at a time, then receive hiring-manager style feedback.
        </p>
      </div>
      <div className="mock-start-features" aria-label="Mock interview features">
        <span>6 to 10 role-specific questions</span>
        <span>Saved progress</span>
        <span>STAR feedback</span>
      </div>
      <button
        type="button"
        className="app-button-primary"
        disabled={busy}
        onClick={onStart}
      >
        {busy ? "Building your mock interview..." : "Start mock interview"}
      </button>
    </section>
  );
}

function ResultsPanel({
  mockInterview,
  title,
  onDownload
}: {
  mockInterview: MockInterviewState;
  title: string;
  onDownload: () => void;
}) {
  const feedback = mockInterview.feedback;
  const questionMap = useMemo(
    () => new Map(mockInterview.questions.map((question) => [question.id, question])),
    [mockInterview.questions]
  );
  if (!feedback) return null;

  const strongest = feedback.perQuestionFeedback
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
  const needsWork = feedback.perQuestionFeedback
    .slice()
    .sort((a, b) => a.score - b.score)
    .slice(0, 2);

  return (
    <section className="mock-results">
      <div className="mock-results-hero">
        <div>
          <p className="app-kicker">Interview feedback</p>
          <h2 className="mt-3 app-heading text-3xl">Your readiness review is ready.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
            This feedback is based on how directly your answers connected your experience to {title}.
          </p>
        </div>
        <div className="mock-score">
          <span>{Math.round(feedback.overallScore)}</span>
          <strong>{feedback.readinessLevel}</strong>
        </div>
      </div>

      <div className="mock-results-actions">
        <button type="button" className="saved-doc-action-primary" onClick={onDownload}>
          Download TXT
        </button>
      </div>

      <div className="mock-results-grid">
        <SummaryList title="Strengths" items={feedback.strengths} />
        <SummaryList title="Risks to tighten" items={feedback.risks} />
      </div>

      <div className="mock-results-grid">
        <FeedbackPreview title="Strongest answers" items={strongest} questionMap={questionMap} />
        <FeedbackPreview title="Needs more proof" items={needsWork} questionMap={questionMap} />
      </div>

      <section className="mock-feedback-list">
        <div>
          <p className="app-kicker">Question-by-question coaching</p>
          <h3 className="mt-2 app-heading text-2xl">How to make each answer stronger</h3>
        </div>
        {feedback.perQuestionFeedback.map((item) => {
          const question = questionMap.get(item.questionId);
          return (
            <article key={item.questionId} className="mock-feedback-card">
              <div className="mock-feedback-card-header">
                <div>
                  <span>{question?.category ?? "Interview question"}</span>
                  <h4>{question?.question ?? item.questionId}</h4>
                </div>
                <strong>{Math.round(item.score)}/100</strong>
              </div>
              <div className="mock-feedback-points">
                <p><span>What worked</span>{item.whatWorked}</p>
                <p><span>What was missing</span>{item.whatWasMissing}</p>
                <p><span>How to improve</span>{item.howToImprove}</p>
                <p><span>Stronger framing</span>{item.strongerFraming}</p>
              </div>
              <div className="mock-star-grid">
                <StarItem label="Situation" value={item.suggestedSTARStructure.situation} />
                <StarItem label="Task" value={item.suggestedSTARStructure.task} />
                <StarItem label="Action" value={item.suggestedSTARStructure.action} />
                <StarItem label="Result" value={item.suggestedSTARStructure.result} />
              </div>
            </article>
          );
        })}
      </section>

      <SummaryList title="What to practice before the real interview" items={feedback.finalRecommendations} />
    </section>
  );
}

function SummaryList({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="mock-summary-card">
      <h3>{title}</h3>
      <ul>
        {items.slice(0, 6).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

function FeedbackPreview({
  title,
  items,
  questionMap
}: {
  title: string;
  items: MockInterviewFeedbackItem[];
  questionMap: Map<string, MockInterviewQuestion>;
}) {
  return (
    <article className="mock-summary-card">
      <h3>{title}</h3>
      <div className="space-y-4">
        {items.map((item) => {
          const question = questionMap.get(item.questionId);
          return (
            <div key={item.questionId}>
              <strong className="block text-sm text-[#11233f]">{question?.question ?? item.questionId}</strong>
              <p className="mt-1 text-sm leading-6 text-[#65748a]">{item.strongerFraming}</p>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function StarItem({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span>{label}</span>
      {value}
    </p>
  );
}

function firstUnansweredIndex(mockInterview: MockInterviewState | null) {
  if (!mockInterview?.questions.length) return 0;
  const answered = new Set(mockInterview.answers.map((answer) => answer.questionId));
  const index = mockInterview.questions.findIndex((question) => !answered.has(question.id));
  return index === -1 ? Math.max(mockInterview.questions.length - 1, 0) : index;
}

function answerFor(answers: MockInterviewAnswer[], questionId: string) {
  return answers.find((answer) => answer.questionId === questionId)?.answer ?? "";
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function filenameFromTitle(title: string) {
  return (
    title
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "mock-interview"
  );
}
