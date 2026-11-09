// Serves the static site in public/ and sends www.akashmunshi.com to the bare domain.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'www.akashmunshi.com') {
      url.hostname = 'akashmunshi.com';
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
