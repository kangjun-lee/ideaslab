import { TRPCError } from '@trpc/server'

import { dbClient, DefaultVisible } from '@ideaslab/db'
import { detailStringValidator, detailValidator, galleryPostsValidator } from '@ideaslab/validator'

import { publicProcedure, router } from '~/api/base/trpc'
import { getFreshGalleryAttachments } from '~/service/gallery-attachments'

export const galleryRouter = router({
  posts: publicProcedure.input(galleryPostsValidator).query(async ({ ctx, input }) => {
    const { limit, cursor, categoryIds, authorId, authorHandle } = input

    const result = await dbClient.post.findMany({
      ...(cursor
        ? {
            cursor: {
              id: cursor,
            },
            skip: 1,
          }
        : {}),
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        discordId: true,
        title: true,
        attachments: true,
        author: {
          select: {
            avatar: true,
            name: true,
            discordId: true,
            handle: true,
          },
        },
        createdAt: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        content: true,
      },
      where: {
        categoryId: {
          in: (categoryIds ?? [])?.length > 0 ? categoryIds : undefined,
        },
        author: {
          discordId: authorId,
          handle: authorHandle?.toLowerCase(),
        },
        visible: ctx.session.id ? undefined : DefaultVisible.Public,
      },
    })

    return Promise.all(
      result.map(async (post) => ({
        ...post,
        attachments: await getFreshGalleryAttachments(post),
        content: post.content.length > 300 ? post.content.slice(0, 305) + '...' : post.content,
      })),
    )
  }),
  postDetail: publicProcedure.input(detailValidator).query(async ({ ctx, input: { id } }) => {
    const res = await dbClient.post.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        discordId: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        tags: {
          select: {
            id: true,
            name: true,
          },
        },
        content: true,
        attachments: true,
        category: {
          select: {
            name: true,
            id: true,
          },
        },
        author: {
          select: {
            avatar: true,
            name: true,
            discordId: true,
            handle: true,
          },
        },
        ...(ctx.session.id
          ? {
              comments: {
                orderBy: {
                  createdAt: 'asc',
                },
                select: {
                  discordId: true,
                  content: true,
                  createdAt: true,
                  hasParent: true,
                  author: {
                    select: {
                      avatar: true,
                      name: true,
                    },
                  },
                  parent: {
                    select: {
                      discordId: true,
                      content: true,
                      author: {
                        select: {
                          avatar: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            }
          : {}),
        visible: true,
      },
    })
    if (res && res.visible !== DefaultVisible.Public && !ctx.session.id) {
      throw new TRPCError({ code: 'FORBIDDEN' })
    }
    return res
      ? {
          ...res,
          attachments: await getFreshGalleryAttachments(res),
        }
      : res
  }),
  categories: publicProcedure.query(async () => {
    return await dbClient.category.findMany({ select: { name: true, id: true } })
  }),
  profile: publicProcedure.input(detailStringValidator).query(async ({ ctx, input }) => {
    const user = await dbClient.user.findUnique({
      where: {
        handle: input.id.toLowerCase(),
      },
      select: {
        discordId: true,
        avatar: true,
        createdAt: true,
        handle: true,
        links: true,
        introduce: true,
        name: true,
        roles: {
          select: {
            id: true,
            name: true,
          },
        },
        profileVisible: true,
        _count: {
          select: {
            posts: true,
          },
        },
      },
    })
    if (user && user.profileVisible !== DefaultVisible.Public && !ctx.session.id) {
      throw new TRPCError({ code: 'FORBIDDEN' })
    }
    return user
  }),
})
