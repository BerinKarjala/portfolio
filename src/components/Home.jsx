import React, { useEffect, useState } from "react";
import sanityClient from "../client.js"
import BlockContent from "@sanity/block-content-to-react"
import getYouTubeId from "get-youtube-id"
import YouTube from "react-youtube"

const { projectId, dataset } = sanityClient.config()
const serializers = {
  types: {
    youtube: ({ node }) => {
      const id = getYouTubeId(node?.url)
      if (!id) {
        return null
      }
      return <YouTube className="w-full" videoId={id} opts={{ width: "100%", height: "315" }} />
    },
  },
}

const fallbackContent = {
  title: "Berin Karjala",
  tagline: "Full-Stack Developer",
  summary:
    "I build modern, reliable web experiences that blend clean UI with thoughtful architecture. My work focuses on React front-ends, content-driven platforms with Sanity, and performance-minded delivery.",
  strengthsTitle: "Core strengths",
  strengths: [
    "React, JavaScript, and modern UI patterns",
    "Sanity CMS modeling and content pipelines",
    "UX-focused layout, accessibility, and polish",
    "Reliable build and deployment workflows",
  ],
  ctaLabel: "Contact Me",
  ctaHelper: "Open to full-time and contract opportunities.",
  content: null,
}

export default function Home() {
  const [showContact, setShowContact] = useState(false)
  const [email, setEmail] = useState("")
  const [emailTouched, setEmailTouched] = useState(false)
  const [landing, setLanding] = useState(null)
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const isEmailValid = email.length === 0 || emailPattern.test(email)

  useEffect(() => {
    sanityClient
      .fetch(
        `*[_type == "landingPage"][0]{
          title,
          tagline,
          summary,
          strengthsTitle,
          strengths,
          content,
          ctaLabel,
          ctaHelper
        }`
      )
      .then((data) => setLanding(data))
      .catch(console.error)
  }, [])

  const content = landing || fallbackContent
  const strengths =
    content?.strengths && content.strengths.length > 0
      ? content.strengths
      : fallbackContent.strengths
  return (
    <main  className="relative forest-bg text-emerald-50">
        <section className="container mx-auto px-4 sm:px-6 md:px-8 py-10 flex justify-center">
        <div  className="bg-white bg-opacity-75 rounded-lg shadow-2xl p-6 sm:p-8 lg:p-10 w-auto max-w-3xl inline-block text-gray-800">
          <p className="uppercase tracking-wider text-xs sm:text-sm">{content?.tagline || fallbackContent.tagline}</p>
          <h1 className="text-3xl sm:text-4xl font-semibold mt-2">{content?.title || fallbackContent.title}</h1>
          <p className="mt-4 leading-relaxed">
            {content?.summary || fallbackContent.summary}
          </p>
          <div className="mt-6">
            <h2 className="text-lg font-semibold">{content?.strengthsTitle || fallbackContent.strengthsTitle}</h2>
            <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {strengths.map((strength) => (
                <li key={strength}>{strength}</li>
              ))}
            </ul>
          </div>
          {content?.content?.length > 0 && (
            <div className="mt-6 prose prose-sm sm:prose-base max-w-none text-gray-800 prose-a:text-gray-800">
              <BlockContent blocks={content.content} projectId={projectId} dataset={dataset} serializers={serializers} />
            </div>
          )}
          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              type="button"
              className="cta-button font-semibold text-lg px-7 py-3 rounded-lg shadow"
              onClick={() => setShowContact((visible) => !visible)}
              aria-expanded={showContact}
            >
              {content?.ctaLabel || fallbackContent.ctaLabel}
            </button>
            {showContact && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@domain.com"
                    className="w-full sm:w-64 px-4 py-2 rounded border border-emerald-200 text-gray-800"
                    required
                    pattern="^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"
                    aria-label="Your email address"
                    aria-invalid={!isEmailValid}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    onBlur={() => setEmailTouched(true)}
                  />
                  <button
                    type="button"
                    className="cta-button font-semibold px-4 py-2 rounded-lg shadow"
                  >
                    Submit
                  </button>
                </div>
                {emailTouched && !isEmailValid && (
                  <p className="text-xs">Enter a valid email address.</p>
                )}
              </div>
            )}
          </div>
          <p className="mt-4 text-sm text-center">{content?.ctaHelper || fallbackContent.ctaHelper}</p>
          </div>
        </section>
    </main>
  );
}
