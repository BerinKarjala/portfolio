import React, { useEffect, useState } from "react"
import sanityClient from "../client.js"
import waterDrop from "../drop-of-water.jpg"
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
        <main className="relative bg-gray-900">
            <img src={waterDrop} alt="A drop of water in a pool creating ripples across the surface of the pool." className="absolute object-cover w-full bg-fixed" />
            <div className="p-10 lg:pt-0 container mx-auto px-14 relative">
                <section className="bg-white rounded-lg shadow-2xl lg:flex p-20">
                    <img src={urlFor(author.authorImage).url()} className="rounded w-32 h-32 lg:w-64 lg:h-64 mr-8" alt={author.name} />
                    <div className="text-lg flex flex-col justify-center">
                        <h1 className="cursive text-6x text-black-300 mb-4">
                            <span className="text-black-100">{author.name}</span>
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