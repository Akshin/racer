/**
 * Какой атлас велосипедиста ставить на половину экрана.
 * Левый: женщина racer1, мужчина racer3. Правый: женщина racer2, мужчина racer4.
 */
export function racerSheetAlias(laneIndex: number, gender?: string | null): string {
  const man = gender === 'male'
  return laneIndex === 0 ? (man ? 'racer3' : 'racer1') : man ? 'racer4' : 'racer2'
}
