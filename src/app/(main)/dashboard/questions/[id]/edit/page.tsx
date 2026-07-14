import { QuestionEditor } from "../../_components/question-editor";

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <QuestionEditor questionId={id} />;
}
