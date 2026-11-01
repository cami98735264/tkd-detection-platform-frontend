import { Badge } from "@/components/ui/badge";

import { EXAM_RESULT_LABEL } from "../lib/examScore";
import type { ExamResult } from "../types";

export function ExamResultBadge({ result }: { result: ExamResult | null | undefined }) {
  if (!result) return <Badge variant="outline-muted">Manual</Badge>;
  const variant =
    result === "approved" ? "success" : result === "rejected" ? "destructive" : "warning";
  return <Badge variant={variant}>{EXAM_RESULT_LABEL[result] ?? result}</Badge>;
}
