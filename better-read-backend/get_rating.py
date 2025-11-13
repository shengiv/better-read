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
    Lambda function to get user ratings
    Supports:
    - GET /ratings?user_id={user_id}&isbn={isbn} - Get specific rating
    - GET /ratings?user_id={user_id} - Get all ratings for user
    """
    try:
        # Get query parameters
        query_params = event.get('queryStringParameters') or {}
        user_id = query_params.get('user_id')
        isbn = query_params.get('isbn')
        
        # Validate required parameter
        if not user_id:
            return create_error_response(400, "Missing required parameter: user_id")
        
        # Get DynamoDB table
        table_name = os.environ['RATINGS_TABLE_NAME']
        table = dynamodb.Table(table_name)
        
        # If both user_id and isbn provided, get specific rating
        if isbn:
            try:
                response = table.get_item(
                    Key={
                        'user_id': user_id,
                        'isbn': isbn
                    }
                )
                
                if 'Item' not in response:
                    return create_error_response(404, "Rating not found")
                
                item = response['Item']
                rating = {
                    'user_id': item['user_id'],
                    'isbn': item['isbn'],
                    'rating': item['rating'],
                    'created_at': item.get('created_at', ''),
                    'updated_at': item.get('updated_at', '')
                }
                
                return create_success_response(rating)
                
            except Exception as e:
                logger.error(f"Error getting rating: {str(e)}")
                return create_error_response(500, "Internal server error")
        
        # If only user_id provided, get all ratings for user
        else:
            try:
                response = table.query(
                    KeyConditionExpression='user_id = :user_id',
                    ExpressionAttributeValues={
                        ':user_id': user_id
                    }
                )
                
                ratings = []
                for item in response['Items']:
                    rating = {
                        'user_id': item['user_id'],
                        'isbn': item['isbn'],
                        'rating': item['rating'],
                        'created_at': item.get('created_at', ''),
                        'updated_at': item.get('updated_at', '')
                    }
                    ratings.append(rating)
                
                result = {
                    'ratings': ratings,
                    'count': len(ratings)
                }
                
                return create_success_response(result)
                
            except Exception as e:
                logger.error(f"Error getting ratings: {str(e)}")
                return create_error_response(500, "Internal server error")
        
    except Exception as e:
        logger.error(f"Error in lambda_handler: {str(e)}")
        return create_error_response(500, "Internal server error")

def create_success_response(body):
    """Create a successful API Gateway response"""
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS'
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
            'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS'
        },
        'body': json.dumps({'error': message})
    }

