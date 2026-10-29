'use client'

import NotFoundImage from '~/assets/not-found.svg'
import { ButtonLink, CustomImage } from '~/components/common'
import { MainLayout } from '~/layouts'

const NotFoundPage = () => {
  return (
    <MainLayout
      title="페이지를 찾지 못하였어요"
      description="잘못된 경로로 찾아오신거 같아요. 찾으시는 페이지를 발견하지 못하였습니다."
    >
      <div className="text-left flex items-start justify-center flex-col min-h-[65vh] max-w-2xl mx-auto py-16">
        <div className="w-48">
          <CustomImage alt="" src={NotFoundImage} />
        </div>
        <h1 className="font-bold text-title-color text-4xl mt-6 mb-3">페이지를 찾지 못하였어요</h1>
        <div className="text-description-color">
          잘못된 경로로 찾아오신 것 같아요. 찾으시는 페이지를 발견하지 못하였습니다.
        </div>
        <div className="flex mt-4">
          <ButtonLink href="/" variant="light">
            홈으로 가기
          </ButtonLink>
        </div>
      </div>
    </MainLayout>
  )
}

export default NotFoundPage
