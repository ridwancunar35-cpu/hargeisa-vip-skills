
export async function onRequestPost({ request, env }) {
  try {
    if (!env.GAS_WEB_APP_URL || !env.API_SECRET) {
      return Response.json({
        success: false,
        message: 'Server configuration is missing.'
      }, { status: 500 });
    }

    const body = await request.json();

    if (!body.action || !Array.isArray(body.args)) {
      return Response.json({
        success: false,
        message: 'Invalid API request.'
      }, { status: 400 });
    }

    // Send request securely to Google Apps Script
    const upstream = await fetch(env.GAS_WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        secret: env.API_SECRET,
        action: body.action,
        args: body.args
      }),
      redirect: 'follow'
    });

    const raw = await upstream.text();

    let result;

    try {
      result = JSON.parse(raw);
    } catch (error) {
      return Response.json({
        success: false,
        message: 'Google Apps Script returned an invalid response.'
      }, { status: 502 });
    }

    if (result && result.__error) {
      return Response.json({
        success: false,
        message: result.message || 'API request failed.'
      }, { status: 401 });
    }

    return Response.json(result, {
      headers: {
        'Cache-Control': 'no-store'
      }
    });

  } catch (error) {
    return Response.json({
      success: false,
      message: error.message || 'Connection error.'
    }, { status: 500 });
  }
}
// Deployment refresh
