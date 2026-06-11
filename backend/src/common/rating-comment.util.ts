export function scoreLabelJa(score: number): string {
  if (score >= 5) return '素晴らしい!';
  if (score >= 4) return 'とても良い';
  if (score >= 3) return '普通';
  if (score >= 2) return '改善が必要';
  return '不満';
}
