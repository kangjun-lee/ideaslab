import Link from 'next/link'

const Feature = ({ name, description }: { name: string; description: string }) => (
  <div className="home-feature">
    <h3>{name}</h3>
    <p className="text-description-color">{description}</p>
  </div>
)

const reasons = [
  '다양한 분야의 창작하는 사람들과 만나면서 여러 방면으로 피드백을 받을 수 있기 때문입니다.',
  '창작을 하다가 아이디어가 막히면 논의하기 좋은 공간이기 때문입니다.',
  '혼자 작업하다가 외로우면 같이 떠들면서 작업하기 좋은 곳입니다.',
  '혼자서 만들기 어러운 프로젝트를 다양한 사람들과 협업할 수 있는 곳입니다.',
]

export const HomePage = () => (
  <div className="home-page">
    <section className="home-hero">
      <div className="container home-hero-inner">
        <div>
          <h1>당신의 아이디어가 <br/>현실로 이루어지길</h1>
          <p className="mt-6">
            아이디어스랩은 창작자의 아이디어가 현실로 이루어지도록 도와주는 디스코드 서버입니다.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <a
              rel="noopener noreferrer"
              href={process.env.NEXT_PUBLIC_DISCORD_INVITE_URL}
              className="site-button site-button-primary"
            >
              가입하기
            </a>
            <Link href="/gallery" className="site-button site-button-secondary">
              둘러보기
            </Link>
          </div>
        </div>
        <div className="home-hero-manifest">
          <p>여러 분야의 창작자와</p>
          <ul>
            <li>작업</li>
            <li>아이디어 논의</li>
            <li>프로젝트 진행</li>
          </ul>
          <p>등을 할 수 있어요.</p>
        </div>
      </div>
    </section>

    <section className="home-section container grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-12">
      <div>
        <h2>아이디어스 랩 <br/>컨텐츠</h2>
        <p className="mt-5 text-lg text-description-color">
          아이디어스랩 디스코드 서버에는 많은 컨텐츠가 준비되어 있습니다.
        </p>
      </div>
      <div className="home-feature-list">
        <Feature
          name="다양한 분야의 갤러리"
          description="각 창작분야별로 자신의 작업물을 업로드하여 공유할 수 있습니다."
        />
        <Feature
          name="자율적인 통화방"
          description="통화방은 직접 생성할 수 있으며, 용도에 따라 다양하게 사용될 수 있습니다."
        />
        <Feature
          name="즐거움은 커뮤니티다"
          description="일상이야기, 작업관련 이야기, 작품추천, 정보를 포럼형태로 이야기 할 수 있습니다."
        />
        <Feature
          name="사소한 것부터 큰 것 까지! 같이하실분"
          description="같이 할 친구부터 해서 동료까지 구하는 곳입니다. 예를들어 게임부터해서 스터디, 함께할 프로젝트 인원을 구할 수 있습니다."
        />
        <Feature
          name="아이디어스 랩의 꽃, 프로젝트"
          description="프로젝트 인원을 구하게 되면 서버내에서 논의하고 진행할 수 있습니다. 프로젝트가 완료되면 프로젝트 결과물을 올릴 수 있습니다."
        />
      </div>
    </section>

    <section className="home-section home-reasons">
      <div className="container grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-12">
        <h2>아이디어스 랩에서 활동해야 하는 이유!</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {reasons.map((reason, index) => (
            <p className="home-reason text-lg" key={reason}>
              <span className="home-reason-number">0{index + 1}</span>
              {reason}
            </p>
          ))}
        </div>
      </div>
    </section>

    <section className="home-section home-invite">
      <div className="container flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <h2>자, 이제 함께 할 준비가 되었나요?</h2>
        <a
          rel="noopener noreferrer"
          href={process.env.NEXT_PUBLIC_DISCORD_INVITE_URL}
          className="site-button site-button-primary w-fit"
        >
          가입하기
        </a>
      </div>
    </section>
  </div>
)
