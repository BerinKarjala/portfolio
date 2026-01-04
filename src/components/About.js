import React, { useEffect, useState } from "react"
import sanityClient from "../client.js"
import imageUrlBuilder from "@sanity/image-url"
import BlockContent from "@sanity/block-content-to-react"

const builder = imageUrlBuilder(sanityClient)
function urlFor(source){
    return builder.image(source)
}

export default function About(){
    const [author, setAuthor ] = useState(null)

    useEffect(()=>{
        sanityClient.fetch(
            `*[_type == "author"]{
                name,
                bio,
                "authorImage": image.asset->url
            }
            `
        ).then((data) => setAuthor(data[0])).catch(console.error)
    }, [])
    if (!author) return <div>Loading...</div>
    return (
        <main className="relative forest-bg text-emerald-50">
            <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-14 py-10 lg:pt-5 relative">
                <section className="bg-white bg-opacity-90 rounded-lg shadow-2xl flex flex-col lg:flex-row gap-8 p-6 sm:p-10 lg:p-16 xl:p-20">
                    <img src={urlFor(author.authorImage).url()} className="rounded w-24 h-24 sm:w-32 sm:h-32 lg:w-56 lg:h-56 xl:w-64 xl:h-64 lg:mr-8 object-cover" alt={author.name} />
                    <div className="text-lg flex flex-col justify-center text-gray-900">
                        <h1 className="cursive text-6x text-emerald-800 mb-4">
                            <span className="text-emerald-900">{author.name}</span>
                        </h1>
                        <div className="prose lg:prose-xl text-black">
                            <BlockContent blocks={author.bio} projectId="jp1px5kh" dataset="production" />
                        </div>
                    </div>
                </section>
            </div>
        </main>
    )
}
