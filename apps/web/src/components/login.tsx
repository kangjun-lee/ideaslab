import { useCallback } from 'react'
import { toast } from 'react-hot-toast'

import ForbiddenImage from '~/assets/forbidden.svg'
import { Button, CustomImage, Dialog, PinInput } from '~/components/common'
import { ButtonLink } from '~/components/common'
import { useDisclosure } from '~/hooks'
import { trpc } from '~/utils'

export const MemberLoginSection = () => {
  const loginWithPinMutation = trpc.auth.loginWithPin.useMutation({
    onMutate: () => {
      toast.loading('요청 중...', { id: 'mutation' })
    },
    onError: () => {
      toast.error('요청 중 에러가 발생하였어요', { id: 'mutation' })
    },
    onSuccess: ({ success }) => {
      if (!success) {
        toast.error('잘못된 핀 번호에요', { id: 'mutation' })
        return
      }
      toast.success('성공적으로 로그인 되었어요.', { id: 'mutation' })

      location.href = '/'
    },
  })

  const onEnterAll = useCallback(
    (pin: string) => {
      loginWithPinMutation.mutate({ pin })
    },
    [loginWithPinMutation],
  )

  return (
    <>
      <div className="text-lg font-semibold mb-8 leading-relaxed break-keep">
        <div>아이디어스랩 디스코드에서 채팅창에</div>
        <span className="inline-block px-3 py-1 my-2 bg-[var(--color-paper-2)] text-(color:--color-ink) rounded-[var(--radius-control)] font-bold">
          /로그인
        </span>
        을 입력하세요
      </div>

      <div className="border-t border-(color:--color-rule) pt-6">
        <div className="text-lg font-bold text-title-color mb-4">PIN 코드로 로그인하기</div>
        <PinInput name="pin-login" onEnterAll={onEnterAll} />
      </div>
    </>
  )
}

export const MemberOnlyContent = ({ name }: { name: string }) => {
  const [isOpen, handle] = useDisclosure()
  return (
    <>
      <Dialog isOpen={isOpen} close={handle.close}>
        <Dialog.Content size="auto">
          <Dialog.Title title="로그인" />
          <MemberLoginSection />
        </Dialog.Content>
      </Dialog>
      <div className="text-center flex items-center justify-center flex-col min-h-[60vh] px-4 py-12 max-w-xl mx-auto">
        <div className="w-48">
          <CustomImage alt="" src={ForbiddenImage} />
        </div>
        <div className="font-bold text-title-color text-lg mt-4">
          아이디어스랩 회원만 볼 수 있는 {name}이에요
        </div>
        <div className="text-description-color">
          아이디어스 랩 디스코드 서버에 가입하여 다양한 컨텐츠들을 즐기세요!
        </div>
        <div className="flex mt-2">
          <ButtonLink href="/" variant="light">
            확인하러 가기
          </ButtonLink>
        </div>
        <div className="text-xl font-bold mt-12">이미 회원이신가요?</div>
        <div className="flex mt-2">
          <Button variant="light" onClick={handle.open}>
            로그인하기
          </Button>
        </div>
      </div>
    </>
  )
}
