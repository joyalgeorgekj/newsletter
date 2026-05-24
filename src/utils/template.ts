const BLOG_URL = `${process.env.FRONTEND_URL}/blog/building-a-portfolio-that-can-grow-with-me`;
const UNSUBSCRIBE_URL = `${process.env.BASE_URL}/unsubscribe`;

export function template(token: string) {
    return `
        <div
            style="
                max-width: 600px;
                margin: 0 auto;
                padding: 32px;
                font-family: sans-serif;
                line-height: 1.7;
                color: #e4e4e7;
                background: #09090b;
            "
        >
            <h1
                style="
                    color: white;
                    margin-bottom: 24px;
                "
            >
                New article published
            </h1>

            <p>
                I published a new article on my
                portfolio blog.
            </p>

            <h2
                style="
                    color: white;
                    margin-top: 32px;
                "
            >
                Building a Portfolio That Can Grow With Me
            </h2>

            <p>
                Why I rebuilt my portfolio after
                outgrowing the old structure and
                shifted toward a more flexible
                platform focused on open source,
                technical writing, experimentation,
                and long term growth.
            </p>

            <a
                href="${BLOG_URL}"
                style="
                    display: inline-block;
                    margin-top: 24px;
                    padding: 12px 20px;
                    border-radius: 10px;
                    background: white;
                    color: black;
                    text-decoration: none;
                    font-weight: 600;
                "
            >
                Read Article
            </a>

            <hr
                style="
                    margin: 40px 0;
                    border: none;
                    border-top: 1px solid #27272a;
                "
            />

            <p
                style="
                    font-size: 14px;
                    color: #a1a1aa;
                "
            >
                You are receiving this because you
                subscribed to updates from my
                portfolio and blog.
            </p>

            <a
                href="${UNSUBSCRIBE_URL}/${token}"
                style="
                    font-size: 14px;
                    color: #a1a1aa;
                "
            >
                Unsubscribe
            </a>
        </div>
    `;
}
