// 路徑計算與避障算法

/**
 * 檢查線段是否與矩形相交
 */
function lineIntersectsRect(x1, y1, x2, y2, rect) {
  // 檢查端點是否在矩形內
  if (
    (x1 >= rect.x && x1 <= rect.x + rect.width && y1 >= rect.y && y1 <= rect.y + rect.height) ||
    (x2 >= rect.x && x2 <= rect.x + rect.width && y2 >= rect.y && y2 <= rect.y + rect.height)
  ) {
    return true;
  }

  // 檢查線段是否與矩形四邊相交
  const left = rect.x;
  const right = rect.x + rect.width;
  const top = rect.y;
  const bottom = rect.y + rect.height;
  if (
    lineIntersectsLine(x1, y1, x2, y2, left, top, right, top) ||
    lineIntersectsLine(x1, y1, x2, y2, right, top, right, bottom) ||
    lineIntersectsLine(x1, y1, x2, y2, right, bottom, left, bottom) ||
    lineIntersectsLine(x1, y1, x2, y2, left, bottom, left, top)
  ) {
    return true;
  }

  return false;
}

// 檢查兩條線段是否相交
function lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (denom === 0) return false;

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

/**
 * 計算避開障礙物的路徑點
 */
export function calculatePathWithObstacles(startX, startY, endX, endY, obstacles) {
  const PADDING = 20; // 障礙物周圍的安全距離

  // 先嘗試直線路徑
  const directPath = [
    { x: startX, y: startY },
    { x: endX, y: endY },
  ];

  // 檢查直線是否與障礙物相交
  let hasIntersection = false;
  for (const obstacle of obstacles) {
    const paddedObstacle = {
      x: obstacle.x - PADDING,
      y: obstacle.y - PADDING,
      width: obstacle.width + PADDING * 2,
      height: obstacle.height + PADDING * 2,
    };

    if (lineIntersectsRect(startX, startY, endX, endY, paddedObstacle)) {
      hasIntersection = true;
      break;
    }
  }

  // 無相交則返回直線
  if (!hasIntersection) {
    return directPath;
  }

  // 計算繞行路徑
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  // 嘗試不同的繞行策略
  const routes = [
    // 上下繞行
    [
      { x: startX, y: startY },
      { x: startX, y: midY },
      { x: endX, y: midY },
      { x: endX, y: endY },
    ],
    // 左右繞行
    [
      { x: startX, y: startY },
      { x: midX, y: startY },
      { x: midX, y: endY },
      { x: endX, y: endY },
    ],
    // 對角繞行
    [
      { x: startX, y: startY },
      { x: midX, y: midY },
      { x: endX, y: endY },
    ],
  ];

  // 找到第一條不相交的路徑
  for (const route of routes) {
    let routeValid = true;
    for (let i = 0; i < route.length - 1; i++) {
      const segment = {
        x1: route[i].x,
        y1: route[i].y,
        x2: route[i + 1].x,
        y2: route[i + 1].y,
      };

      for (const obstacle of obstacles) {
        const paddedObstacle = {
          x: obstacle.x - PADDING,
          y: obstacle.y - PADDING,
          width: obstacle.width + PADDING * 2,
          height: obstacle.height + PADDING * 2,
        };

        if (lineIntersectsRect(segment.x1, segment.y1, segment.x2, segment.y2, paddedObstacle)) {
          routeValid = false;
          break;
        }
      }

      if (!routeValid) break;
    }

    if (routeValid) {
      return route;
    }
  }

  // 所有路徑都失敗則返回直線
  return directPath;
}

/**
 * 生成通過多個路徑點的平滑曲線
 */
export function generatePathThroughWaypoints(waypoints) {
  if (waypoints.length < 2) {
    return "";
  }

  if (waypoints.length === 2) {
    // 兩點直線
    const [start, end] = waypoints;
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  }

  // 多段平滑曲線
  let path = `M ${waypoints[0].x} ${waypoints[0].y}`;

  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1];
    const curr = waypoints[i];
    const next = waypoints[i + 1];

    if (next) {
      // 通過此點的平滑曲線
      const controlDist = 30;
      const dx1 = curr.x - prev.x;
      const dy1 = curr.y - prev.y;
      const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      const dx2 = next.x - curr.x;
      const dy2 = next.y - curr.y;
      const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

      const cp1x = curr.x - (dx1 / dist1) * Math.min(controlDist, dist1 / 2);
      const cp1y = curr.y - (dy1 / dist1) * Math.min(controlDist, dist1 / 2);
      const cp2x = curr.x + (dx2 / dist2) * Math.min(controlDist, dist2 / 2);
      const cp2y = curr.y + (dy2 / dist2) * Math.min(controlDist, dist2 / 2);

      path += ` L ${cp1x} ${cp1y} Q ${curr.x} ${curr.y} ${cp2x} ${cp2y}`;
    } else {
      // 最後一點
      path += ` L ${curr.x} ${curr.y}`;
    }
  }

  return path;
}
