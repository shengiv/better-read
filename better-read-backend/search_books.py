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
    Lambda function to search books by title using full-text search
    """
    try:
        # Get query parameters
        query_params = event.get('queryStringParameters') or {}
        title = query_params.get('title')
        
        if not title:
            return create_error_response(400, "title parameter is required")
        
        # Normalize search term
        search_term = title.lower().strip()
        
        # Get DynamoDB table
        table_name = os.environ['BOOKS_TABLE_NAME']
        table = dynamodb.Table(table_name)
        
        # For partial text search, use scan with contains filter on title_normalized field
        logger.info(f"Searching for: '{search_term}'")
        
        # Scan through the entire dataset with proper pagination
        all_items = []
        last_evaluated_key = None
        
        while True:
            scan_kwargs = {
                'FilterExpression': 'contains(title_normalized, :search_term)',
                'ExpressionAttributeValues': {
                    ':search_term': search_term
                }
            }
            
            if last_evaluated_key:
                scan_kwargs['ExclusiveStartKey'] = last_evaluated_key
            
            response = table.scan(**scan_kwargs)
            all_items.extend(response['Items'])
            
            # Check if there are more items to scan
            if 'LastEvaluatedKey' not in response:
                break
            last_evaluated_key = response['LastEvaluatedKey']
            
            logger.info(f"Scanned batch, found {len(response['Items'])} items, total so far: {len(all_items)}")
        
        logger.info(f"Found {len(all_items)} items after scanning entire dataset")
        
        # Format books for response
        books = []
        for item in all_items:
            book = {
                'isbn': item['isbn'],
                'title': item['title'],
                'author': item['author'],
                'year_of_publication': item['year_of_publication'],
                'publisher': item['publisher']
            }
            books.append(book)
        
        # Create response
        result = {
            'books': books,
            'search_term': title,
            'count': len(books)
        }
        
        return create_success_response(result)
        
    except Exception as e:
        logger.error(f"Error searching books: {str(e)}")
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
