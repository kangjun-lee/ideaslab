import Link from 'next/link'

export const Footer = () => {
  return (
    <footer className="bg-gray-100 shadow p-4 sm:p-5 xl:p-5 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
      <div className="container sm:flex sm:items-center sm:justify-between mx-auto">
        <p className="mb-2 text-sm text-center text-gray-500 dark:text-gray-400 sm:mb-0">
          &copy; 2020-2023 <span>아이디어스 랩</span>
        </p>
        <div className="flex justify-center items-center space-x-1">
          <Link href="/privacy" className="inline-flex justify-center p-2 text-gray-500 rounded-lg cursor-pointer dark:text-gray-400 dark:hover:text-white hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-600">
            
              이용약관
            
          </Link>
          <Link href="/info" className="inline-flex justify-center p-2 text-gray-500 rounded-lg cursor-pointer dark:text-gray-400 dark:hover:text-white hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-600">
            
              웹사이트 정보
            
          </Link>
          <a
            href="https://github.com/gangjun06/ideaslab"
            className="inline-flex justify-center p-2 text-gray-500 rounded-lg cursor-pointer dark:text-gray-400 dark:hover:text-white hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-600"
          >
            소스코드
          </a>
        </div>
      </div>
    </footer>
  );
}
