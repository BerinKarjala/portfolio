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
        <main className="relative bg-gradient-to-br from-green-900 via-emerald-800 to-lime-600 min-h-screen text-emerald-50">
            <div className="p-10 lg:pt-5 container mx-auto px-14 relative">
                <section className="bg-white bg-opacity-90 rounded-lg shadow-2xl lg:flex p-20">
                    <img src={urlFor(author.authorImage).url()} className="rounded w-32 h-32 lg:w-64 lg:h-64 mr-8" alt={author.name} />
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
