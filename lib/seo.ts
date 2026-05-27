export const siteConfig = {
  name: "ფრჩხილის სტუდია",
  description:
    "მანიკური, პედიკური, ფრჩხილის დაგრძელება და მოვლა თბილისში. დაჯავშნე სერვისი, სპეციალისტი და თავისუფალი დრო ონლაინ.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  locale: "ka_GE",
};

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}
