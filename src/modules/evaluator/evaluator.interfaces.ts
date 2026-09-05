export interface IOption {
  id: string;
  text: string;
}

export interface IQuestion {
  id: string;
  question: string;
  options: IOption[];
  marks: number;
}

export interface IAnswer {
  questionId: string;
  answer: string;
}

export interface ICreateAssessmentPayload {
  title: string;
  description?: string;
  duration: number;
  price: number;
  passingPercentage: number;
  questions: IQuestion[];
  answer: IAnswer[];
  thumbnailKey?: string;
}

export interface IPresignThumbnailUploadPayload {
  fileName: string;
  fileType: string;
}
