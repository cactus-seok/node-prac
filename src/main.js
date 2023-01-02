// @ts-check

/* 키워드로 검색해서 나온 이미지를 원하는 사이즈로 리사이징해서 돌려주는 서버. */
require('dotenv').config()

const fs = require('fs')
const http = require('http')
const { createApi } = require('unsplash-js')
const { default: fetch } = require('node-fetch')

const unsplash = createApi({
  accessKey: process.env.UNSPLASH_API_ACCESS_KEY,
  // @ts-ignore
  fetch,
})

/**
 * @param {string} query
 */
async function searchImage(query) {
  const result = await unsplash.search.getPhotos({ query })

  if (!result.response) {
    throw new Error('Failed to seaarch image.')
  }

  const image = result.response.results[0]

  if (!image) {
    throw new Error('No image found.')
  }

  return {
    description: image.description || image.alt_description,
    url: image.urls.regular,
  }
}

const server = http.createServer((req, res) => {
  async function main() {
    const result = await searchImage('mountain')
    const resp = await fetch(result.url)

    resp.body.pipe(res)
  }

  main()
})

const PORT = 5000

server.listen(5000, () => {
  console.log('The server is listening at port', PORT)
})