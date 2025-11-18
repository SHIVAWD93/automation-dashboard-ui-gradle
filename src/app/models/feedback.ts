export interface FeedbackRequest {
  feedback: string;
  testerId: number;
}

export interface Feedback {
  feedbackId: number;
  feedback: string;
  createdAt: string;
  tester: {
    id: number;
    name?: string;
    // other tester fields if any
  };
}
