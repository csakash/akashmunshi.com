// Serves the static site in public/. Sends http to https and www to the bare domain.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.protocol === 'http:' || url.hostname === 'www.akashmunshi.com') {
      url.protocol = 'https:';
      url.hostname = 'akashmunshi.com';
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
