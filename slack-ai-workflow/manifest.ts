import { Manifest } from "deno-slack-sdk/mod.ts";
import { AnswerQuestionDefinition } from "./functions/answer_question.ts";

export default Manifest({
  name: "invest-broker-ai-workflow",
  description: "Private AI question-answer workflow for Invest-broker.",
  functions: [AnswerQuestionDefinition],
  botScopes: [],
});
