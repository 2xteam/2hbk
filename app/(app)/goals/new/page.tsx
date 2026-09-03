import { GoalForm } from "@/components/GoalForm";
import { Sheet } from "@/components/Sheet";

export default function NewGoalPage() {
  return (
    <>
      <Sheet
        tone="dark"
        ornament
        eyebrow="NEW GOAL"
        headline="무엇을 몇 번 해볼까요?"
        lead="필요한 스티커 수만큼 빈 칸이 생겨요. 너무 크게 잡기보다 이번 주에 끝낼 수 있는 크기가 좋아요."
      />
      <Sheet>
        <GoalForm />
      </Sheet>
    </>
  );
}
