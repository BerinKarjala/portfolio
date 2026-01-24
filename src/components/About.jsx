import React, { useEffect, useRef, useState } from "react"
import sanityClient from "../client.js"
import BlockContent from "@sanity/block-content-to-react"
import Seo, { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL, SOCIAL_LINKS } from "./Seo"
import { cancelIdle, runWhenIdle } from "../utils/idleCallback"

const { projectId, dataset } = sanityClient.config()

export default function About(){
    const [author, setAuthor ] = useState(null)
    const certificateRowRef = useRef(null)

    useEffect(()=>{
        let isActive = true
        const handle = runWhenIdle(() => {
            sanityClient.fetch(
                `*[_type == "author"][0]{
                    name,
                    bio,
                    image{
                        asset->{
                            url
                        }
                    },
                    certificates[]{
                        title,
                        kind,
                        alt,
                        issuedBy,
                        issuedDate,
                        image{
                            asset->{
                                url
                            }
                        },
                        pdf{
                            asset->{
                                url
                            }
                        },
                        thumbnail{
                            asset->{
                                url
                            }
                        }
                    }
                }`
            ).then((data) => {
                if (isActive) {
                    setAuthor(data)
                }
            }).catch(console.error)
        })

        return () => {
            isActive = false
            cancelIdle(handle)
        }
    }, [])
    if (!author) return <div>Loading...</div>
    const certificates = Array.isArray(author.certificates) ? author.certificates : []
    const bioBlocks = Array.isArray(author.bio) ? author.bio : []
    const workIndex = bioBlocks.findIndex((block) => {
        if (block?._type !== "block") return false
        const text = block.children?.map((child) => child.text).join("").toLowerCase() || ""
        return text.includes("work experience")
    })
    const shouldSplitBio = certificates.length > 0 && workIndex > -1
    const introBlocks = shouldSplitBio ? bioBlocks.slice(0, workIndex) : bioBlocks
    const workBlocks = shouldSplitBio ? bioBlocks.slice(workIndex) : []
    const bioText = introBlocks
        .map((block) => block?.children?.map((child) => child.text).join("") || "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
    const pageDescription = bioText
        ? (bioText.length > 160 ? `${bioText.slice(0, 157)}...` : bioText)
        : DEFAULT_DESCRIPTION
    const authorName = author?.name || SITE_NAME
    const authorImage = author?.image?.asset?.url
    const personSchema = {
        "@context": "https://schema.org",
        "@type": "Person",
        name: authorName,
        url: SITE_URL,
        jobTitle: "Full-Stack Developer",
        sameAs: SOCIAL_LINKS,
        image: authorImage || undefined,
    }
    const webPageSchema = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "About",
        url: `${SITE_URL}/about`,
        description: pageDescription,
        isPartOf: {
            "@type": "WebSite",
            name: SITE_NAME,
            url: SITE_URL,
        },
    }

    const scrollCertificates = (direction) => {
        const row = certificateRowRef.current
        if (!row) return
        const amount = Math.round(row.clientWidth * 0.8) || 320
        row.scrollBy({ left: direction * amount, behavior: "smooth" })
    }
    return (
        <>
        <Seo
            title="About Berin Karjala"
            description={pageDescription}
            path="/about"
            image={authorImage}
            jsonLd={[personSchema, webPageSchema]}
        />
        <main className="relative forest-bg text-emerald-50">
            <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-14 py-10 lg:pt-5 relative">
                <section className="bg-white bg-opacity-90 rounded-lg shadow-2xl flex flex-col lg:flex-row gap-8 p-6 sm:p-10 lg:p-16 xl:p-20">
                    <img
                        src={author.image?.asset?.url}
                        className="rounded w-24 h-24 sm:w-32 sm:h-32 lg:w-56 lg:h-56 xl:w-64 xl:h-64 lg:mr-8 object-cover"
                        alt={author.name}
                        loading="lazy"
                        decoding="async"
                    />
                    <div className="text-lg flex w-full min-w-0 flex-1 flex-col justify-center text-gray-900">
                        <h1 className="cursive text-6x text-emerald-800 mb-4">
                            <span className="text-emerald-900">{author.name}</span>
                        </h1>
                        <div className="prose lg:prose-xl text-black">
                            <BlockContent blocks={introBlocks} projectId={projectId} dataset={dataset} />
                        </div>
                        {certificates.length > 0 ? (
                            <div className="mt-8 w-full min-w-0 overflow-hidden">
                                <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-semibold text-emerald-900">Certificates</h2>
                                        <p className="text-sm text-emerald-700">Click a certificate to view.</p>
                                    </div>
                                    <div className="flex items-center gap-2 sm:ml-auto">
                                        <button
                                            type="button"
                                            className="rounded-full border border-emerald-300 px-3 py-1 text-sm text-emerald-800 hover:border-emerald-500 hover:text-emerald-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                            onClick={() => scrollCertificates(-1)}
                                            aria-label="Scroll certificates left"
                                        >
                                            Prev</button>
                                        <button
                                            type="button"
                                            className="rounded-full border border-emerald-300 px-3 py-1 text-sm text-emerald-800 hover:border-emerald-500 hover:text-emerald-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                            onClick={() => scrollCertificates(1)}
                                            aria-label="Scroll certificates right"
                                        >
                                            Next</button>
                                    </div>
                                </div>
                                <div
                                    className="mt-4 flex w-full max-w-full gap-4 overflow-x-auto pb-2 pr-2 scroll-smooth snap-x snap-mandatory"
                                    ref={certificateRowRef}
                                >
                                    {certificates.map((certificate, index) => {
                                        const imageUrl = certificate.image?.asset?.url
                                        const pdfUrl = certificate.pdf?.asset?.url
                                        const isPdf = certificate.kind === "pdf" || (!certificate.kind && !!pdfUrl && !imageUrl)
                                        const thumbnailUrl = certificate.thumbnail?.asset?.url
                                            || (!isPdf ? imageUrl : null)
                                        const openUrl = isPdf ? pdfUrl : imageUrl
                                        const isDisabled = !openUrl
                                        return (
                                            <button
                                                key={`${certificate.title || "certificate"}-${index}`}
                                                type="button"
                                                className="flex w-40 shrink-0 snap-start flex-col items-start rounded-lg border border-emerald-200 bg-white bg-opacity-80 p-3 text-left shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
                                                onClick={() => {
                                                    if (!openUrl) return
                                                    window.open(openUrl, "_blank", "noopener,noreferrer")
                                                }}
                                                disabled={isDisabled}
                                                aria-disabled={isDisabled}
                                                aria-label={`Open certificate: ${certificate.title}`}
                                            >
                                                {thumbnailUrl ? (
                                                    <img
                                                        src={thumbnailUrl}
                                                        alt={certificate.alt || certificate.title || "Certificate thumbnail"}
                                                        className="h-24 w-full rounded-md object-cover"
                                                        loading="lazy"
                                                        decoding="async"
                                                    />
                                                ) : (
                                                    <div className="flex h-24 w-full items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-700">
                                                        {isPdf ? "PDF" : "No preview"}
                                                    </div>
                                                )}
                                                <span className="mt-3 w-full truncate text-sm font-semibold text-emerald-900">
                                                    {certificate.title || "Certificate"}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        ) : null}
                        {workBlocks.length > 0 ? (
                            <div className="prose lg:prose-xl text-black mt-6">
                                <BlockContent blocks={workBlocks} projectId={projectId} dataset={dataset} />
                            </div>
                        ) : null}
                    </div>
                </section>
            </div>
        </main>
        </>
    )
}

