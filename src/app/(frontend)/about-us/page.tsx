import Link from "next/link"
//import { fetchAdminBlog } from "../../../lib/api"
//import { BlocksRenderer } from "@strapi/blocks-react-renderer"

export default async function AboutUs() {

    /*
    const adminBlog = await fetchAdminBlog()
    if (!adminBlog) return <p>No content</p>
    */
    return (
        <>
            <article className="prose 
                        prose-h1:text-slate-700 prose-h1:dark:text-white 
                        prose-h2:text-slate-700 prose-h2:dark:text-white
                        prose-h3:text-slate-700 prose-h3:dark:text-white
                        prose-h4:text-slate-700 prose-h4:dark:text-white
                        prose-h5:text-slate-700 prose-h5:dark:text-white
                        max-w-none mx-auto lg:w-150 gap-4 text-slate-600 dark:text-gray-400">
                {/*<BlocksRenderer content={adminBlog.description} />*/}

                {/*<Link href={`mailto:${adminBlog.emailAdmin}`}*/}
                <Link href={`mailto:`}
                    className="text-slate-600 dark:text-gray-400"
                >Por ahora, si quieres aparecer escribeme aquí.</Link>

                <h3>Admin name</h3>{/* {adminBlog.name} */}
            </article>
        </>
    )
}