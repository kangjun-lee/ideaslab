import Image from 'next/image'
import Link from 'next/link'

import NotFoundImage from '~/assets/not-found.svg'
import { ButtonLink } from '~/components/common'
import { MainLayout } from '~/layouts'

const NotFoundPage = () => {
  return (
    <MainLayout
      title="페이지를 찾지 못하였어요"
      description="잘못된 경로로 찾아오신거 같아요. 찾으시는 페이지를 발견하지 못하였습니다."
    >
      <div className="text-center flex items-center justify-center flex-col h-full absolute left-0 right-0 top-0 px-4">
        <div className="w-48">
          <Image alt="" src={NotFoundImage} />
        </div>
        <div className="font-bold text-title-color text-lg mt-4">페이지를 찾지 못하였어요</div>
        <div className="text-description-color">
          잘못된 경로로 찾아오신 것 같아요. 찾으시는 페이지를 발견하지 못하였습니다.
        </div>
        <div className="flex mt-4">
          <Link href="/">
            <ButtonLink variant="light">홈으로 가기</ButtonLink>
          </Link>
        </div>
      </div>
    </MainLayout>
  )
}

export default NotFoundPage
