import { clamp } from "./mathUtils";

export function getBubblePosition(
  item: any,
  tankRect: { x: number; y: number; w: number; h: number },
  insets: { top: number; right: number; bottom: number; left: number },
  bubbleWidth: number,
  bubbleHeight: number,
  FISH_W: number,
  FISH_H: number,
  UI_EDGE_GAP: number
) {
  const fishCenterX = tankRect.x + item.x + FISH_W / 2;
  const fishTopY = tankRect.y + item.y;

  let left = fishCenterX - bubbleWidth / 2;
  let top = fishTopY - bubbleHeight - 12;

  const tankLeft = tankRect.x + UI_EDGE_GAP;
  const tankRight = tankRect.x + tankRect.w - UI_EDGE_GAP;
  const tankTop = tankRect.y + UI_EDGE_GAP;
  const tankBottom = tankRect.y + tankRect.h - UI_EDGE_GAP;

  left = clamp(left, tankLeft, tankRight - bubbleWidth);

  if (top < tankTop) {
    top = fishTopY + FISH_H + 12;
  }

  top = clamp(top, tankTop, tankBottom - bubbleHeight);

  return { left, top };
}