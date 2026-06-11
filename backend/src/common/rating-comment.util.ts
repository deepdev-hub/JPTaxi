const TAG_PATTERN = /【([^】]+)】/g;

export function encodeRatingComment(
  tags: string[],
  body: string,
): string | null {
  const tagPart = tags.map((t) => `【${t.trim()}】`).join('');
  const text = body.trim();
  if (tagPart && text) return `${tagPart}\n${text}`;
  if (tagPart) return tagPart;
  return text || null;
}

export function decodeRatingComment(comment: string | null): {
  tags: string[];
  text: string;
} {
  if (!comment) {
    return { tags: [], text: '' };
  }
  const tags: string[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(TAG_PATTERN.source, 'g');
  while ((match = re.exec(comment)) !== null) {
    tags.push(match[1]);
  }
  const text = comment.replace(TAG_PATTERN, '').trim();
  return { tags, text };
}

export function scoreLabelJa(score: number): string {
  if (score >= 5) return '素晴らしい!';
  if (score >= 4) return 'とても良い';
  if (score >= 3) return '普通';
  if (score >= 2) return '改善が必要';
  return '不満';
}
