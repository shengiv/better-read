import json

def lambda_handler(event, context):
    """
    Lambda function to handle CORS preflight (OPTIONS) requests for all API endpoints
    """
    # Get the requested method and path from the event
    http_method = event.get('httpMethod', 'OPTIONS')
    path = event.get('path', '/')
    
    # Determine allowed methods based on path
    # This allows us to return the correct allowed methods for each endpoint
    allowed_methods = 'GET,POST,PUT,OPTIONS'
    
    if '/books' in path and '/search' not in path:
        allowed_methods = 'GET,OPTIONS'
    elif '/books/search' in path:
        allowed_methods = 'GET,OPTIONS'
    elif '/recommendations' in path:
        allowed_methods = 'POST,OPTIONS'
    elif '/ratings' in path:
        allowed_methods = 'GET,PUT,OPTIONS'
    
    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': allowed_methods,
            'Access-Control-Max-Age': '86400'  # Cache preflight for 24 hours
        },
        'body': ''
    }


