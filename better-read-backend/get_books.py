import json
import boto3
import os
import logging
from decimal import Decimal

# Custom JSON encoder to handle Decimal objects
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')

def lambda_handler(event, context):
    """
    Lambda function to get paginated list of books
    """
    try:
        # Get query parameters
        query_params = event.get('queryStringParameters') or {}
        limit = int(query_params.get('limit', 20))
        last_evaluated_key = query_params.get('last_evaluated_key')
        
        # Validate limit
        if limit > 100:
            limit = 100
        if limit < 1:
            limit = 20
            
        # Get DynamoDB table
        table_name = os.environ['BOOKS_TABLE_NAME']
        table = dynamodb.Table(table_name)
        
        # Prepare scan parameters
        scan_params = {
            'Limit': limit
        }
        
        # Add pagination token if provided
        if last_evaluated_key:
            try:
                scan_params['ExclusiveStartKey'] = json.loads(last_evaluated_key)
            except json.JSONDecodeError:
                return create_error_response(400, "Invalid last_evaluated_key format")
        
        # Scan the table
        response = table.scan(**scan_params)
        
        # Format books for response
        books = []
        for item in response['Items']:
            book = {
                'isbn': item['isbn'],
                'title': item['title'],
                'author': item['author'],
                'year_of_publication': item['year_of_publication'],
                'publisher': item['publisher']
            }
            books.append(book)
        
        # Prepare pagination info
        pagination = {
            'count': len(books),
            'has_more': 'LastEvaluatedKey' in response
        }
        
        if 'LastEvaluatedKey' in response:
            pagination['last_evaluated_key'] = json.dumps(response['LastEvaluatedKey'])
        
        # Create response
        result = {
            'books': books,
            'pagination': pagination
        }
        
        return create_success_response(result)
        
    except Exception as e:
        logger.error(f"Error getting books: {str(e)}")
        return create_error_response(500, "Internal server error")

def create_success_response(body):
    """Create a successful API Gateway response"""
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
        },
        'body': json.dumps(body, cls=DecimalEncoder)
    }

def create_error_response(status_code, message):
    """Create an error API Gateway response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
        },
        'body': json.dumps({'error': message})
    }
