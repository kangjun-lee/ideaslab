import { dbClient } from '@ideaslab/db'

import config from '~/config'
import { cacheGet, cacheSet } from '~/lib/redis'

const redisGalleryCategoryKey = (channelId: string) => `${config.redisPrefix}gallery:${channelId}`

const redisExpire = 60 * 60 * 24 // 24 hours

/**
 * Get gallery category id from channel id
 * @param {string} channelId
 * @returns galleryId
 * @example
 * const categoryId = await getGalleryCategory(channel.id)
 * if (!categoryId) return
 */
export const getGalleryCategory = async (channelId: string) => {
  const cached = await cacheGet(redisGalleryCategoryKey(channelId))
  if (cached) return parseInt(cached)

  const category = await dbClient.category.findUnique({
    where: {
      discordChannel: channelId,
    },
    select: {
      id: true,
    },
  })

  if (!category) return null

  // 캐시 갱신 실패가 조회 결과 반환을 막지 않도록 best-effort로 처리한다.
  await cacheSet(redisGalleryCategoryKey(channelId), category.id, 'EX', redisExpire)

  return category.id
}
