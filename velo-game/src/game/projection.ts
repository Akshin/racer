/**
 * Перспектива одной половины экрана.
 *
 * Камера висит на высоте CAMERA_HEIGHT_M над дорогой и смотрит горизонтально,
 * поэтому проекция сводится к делению на расстояние: точка в z метрах впереди
 * поднимается над горизонтом на (высота × фокус) / z, а метр ширины на том же
 * расстоянии занимает фокус / z пикселей.
 */

import { CAMERA_HEIGHT_M, HORIZON_RATIO, VERTICAL_FOV_DEG } from './config'

export function createProjection(width: number, height: number): Projection {
  const horizonY = height * HORIZON_RATIO
  // Фокусное расстояние в пикселях из вертикального угла обзора.
  const focal = height / 2 / Math.tan((VERTICAL_FOV_DEG * Math.PI) / 360)

  return {
    width,
    height,
    centerX: width / 2,
    horizonY,
    // Ближе этого расстояния дорога уходит за нижний край кадра.
    nearZ: (CAMERA_HEIGHT_M * focal) / (height - horizonY),
    y: (z) => horizonY + (CAMERA_HEIGHT_M * focal) / z,
    scale: (z) => focal / z,
  }
}

/**
 * Четырёхугольник дорожной полосы между двумя x (метры от центра дороги) и двумя
 * расстояниями. Порядок вершин — дальняя пара, затем ближняя, чтобы одни и те же
 * координаты годились и для Graphics.poly, и для треугольников меша.
 */
export function roadQuad(
  projection: Projection,
  leftM: number,
  rightM: number,
  nearZ: number,
  farZ: number,
): number[] {
  const { centerX } = projection
  const nearY = projection.y(nearZ)
  const farY = projection.y(farZ)
  const nearScale = projection.scale(nearZ)
  const farScale = projection.scale(farZ)

  return [
    centerX + leftM * farScale,
    farY,
    centerX + rightM * farScale,
    farY,
    centerX + rightM * nearScale,
    nearY,
    centerX + leftM * nearScale,
    nearY,
  ]
}

/**
 * Склон обочины: внутреннее ребро на земле у кромки дороги, внешнее — выше
 * и дальше. Обе кромки — прямые в vanishing point, поэтому хватает одного квада.
 */
export function slopeQuad(
  projection: Projection,
  innerM: number,
  outerM: number,
  innerHeightM: number,
  outerHeightM: number,
  nearZ: number,
  farZ: number,
): number[] {
  const { centerX } = projection
  const nearScale = projection.scale(nearZ)
  const farScale = projection.scale(farZ)
  const nearY = projection.y(nearZ)
  const farY = projection.y(farZ)

  return [
    centerX + innerM * farScale,
    farY - innerHeightM * farScale,
    centerX + outerM * farScale,
    farY - outerHeightM * farScale,
    centerX + outerM * nearScale,
    nearY - outerHeightM * nearScale,
    centerX + innerM * nearScale,
    nearY - innerHeightM * nearScale,
  ]
}
