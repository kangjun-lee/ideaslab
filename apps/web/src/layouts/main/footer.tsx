import Link from 'next/link'

export const Footer = () => {
  return (
    <footer className="site-footer py-8 text-description-color">
      <div className="container sm:flex sm:items-center sm:justify-between mx-auto gap-4">
        <p className="mb-2 text-sm sm:mb-0">
          &copy; 2020-2023 <span>아이디어스 랩</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/privacy"
            className="inline-flex justify-center p-2 rounded-lg hover:text-primary-color"
          >
            이용약관
          </Link>
          <Link
            href="/info"
            className="inline-flex justify-center p-2 rounded-lg hover:text-primary-color"
          >
            웹사이트 정보
          </Link>
          <a
            href="https://github.com/gangjun06/ideaslab"
            className="inline-flex justify-center p-2 rounded-lg hover:text-primary-color"
          >
            소스코드
          </a>
        </div>
      </div>
    </footer>
  )
}
