
export async function onRequestPost({ request, env }) {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  };

  try {
    // 1. Check server configuration
    if (!env.GAS_WEB_APP_URL || !env.API_SECRET) {
      return Response.json({
        success: false,
        message: 'Server configuration is missing.'
      }, {
        status: 500,
        headers
      });
    }

    // 2. Validate request body
    let body;

    try {
      body = await request.json();
    } catch (error) {
      return Response.json({
        success: false,
        message: 'Invalid JSON request.'
      }, {
        status: 400,
        headers
      });
    }

    if (
      !body ||
      typeof body.action !== 'string' ||
      !body.action.trim() ||
      !Array.isArray(body.args)
    ) {
      return Response.json({
        success: false,
        message: 'Invalid API request.'
      }, {
        status: 400,
        headers
      });
    }

    // 3. Send secure request to Google Apps Script
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

    // 4. Read Google Apps Script response
    const raw = await upstream.text();

    let result;

    try {
      result = JSON.parse(raw);
    } catch (error) {
      return Response.json({
        success: false,
        message: 'Google Apps Script returned an invalid response.'
      }, {
        status: 502,
        headers
      });
    }

    // 5. Validate response structure
    if (
      !result ||
      typeof result !== 'object' ||
      Array.isArray(result)
    ) {
      return Response.json({
        success: false,
        message: 'Invalid response from Google Apps Script.'
      }, {
        status: 502,
        headers
      });
    }

    // 6. Handle backend errors
    if (result.__error) {
      return Response.json({
        success: false,
        message: result.message || 'API request failed.'
      }, {
        status: 401,
        headers
      });
    }

    // 7. Handle upstream HTTP errors
    if (!upstream.ok) {
      return Response.json({
        success: false,
        message: 'Google Apps Script request failed.'
      }, {
        status: 502,
        headers
      });
    }

    // 8. Return successful API response
    return Response.json(result, {
      status: 200,
      headers
    });

  } catch (error) {
    // 9. Handle connection or server errors
    return Response.json({
      success: false,
      message: 'Unable to connect to the server. Please try again.'
    }, {
      status: 500,
      headers
    });
  }
}
