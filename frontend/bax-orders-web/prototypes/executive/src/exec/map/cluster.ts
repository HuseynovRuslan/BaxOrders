/**
 * Pins that would overlap at the current zoom, gathered into one numbered circle. Greedy and in screen pixels: the
 * points are taken largest amount first, and each one either joins the first cluster whose centre is within `radius`
 * pixels or starts its own. With 30–100 areas this is instant, and needs no plugin. A cluster's centre is the mean of
 * its points, so it sits among them; a selected point is never hidden in a cluster.
 */
export interface ClusterInput<T> {
  id: string
  x: number
  y: number
  weight: number
  item: T
}

export interface Cluster<T> {
  x: number
  y: number
  members: ClusterInput<T>[]
}

export function clusterPoints<T>(points: readonly ClusterInput<T>[], radius: number, keepApart: string | null = null): Cluster<T>[] {
  const clusters: Cluster<T>[] = []
  const ordered = [...points].sort((left, right) => right.weight - left.weight || left.id.localeCompare(right.id))
  for (const point of ordered) {
    if (point.id === keepApart) {
      clusters.push({ x: point.x, y: point.y, members: [point] })
      continue
    }
    const near = clusters.find((cluster) => !cluster.members.some((member) => member.id === keepApart)
      && Math.hypot(cluster.x - point.x, cluster.y - point.y) <= radius)
    if (near) {
      near.members.push(point)
      near.x = near.members.reduce((sum, member) => sum + member.x, 0) / near.members.length
      near.y = near.members.reduce((sum, member) => sum + member.y, 0) / near.members.length
    } else {
      clusters.push({ x: point.x, y: point.y, members: [point] })
    }
  }
  return clusters
}
