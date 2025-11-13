import json
import boto3
import os
import logging
from decimal import Decimal
from datetime import datetime

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
    Lambda function to upsert (create or update) user ratings
    """
    try:
        # Parse request body
        if not event.get('body'):
            return create_error_response(400, "Request body is required")
        
        try:
            body = json.loads(event['body'])
        except json.JSONDecodeError:
            return create_error_response(400, "Invalid JSON in request body")
        
        # Validate required fields
        user_id = body.get('user_id')
        isbn = body.get('isbn')
        rating = body.get('rating')
        
        if not user_id:
            return create_error_response(400, "Missing required parameter: user_id")
        if not isbn:
            return create_error_response(400, "Missing required parameter: isbn")
        if rating is None:
            return create_error_response(400, "Missing required parameter: rating")
        
        # Validate rating value (0-10)
        try:
            rating = float(rating)
            if rating < 0 or rating > 10:
                return create_error_response(400, "Rating must be between 0 and 10")
        except (ValueError, TypeError):
            return create_error_response(400, "Rating must be a valid number")
        
        # Get DynamoDB table
        table_name = os.environ['RATINGS_TABLE_NAME']
        table = dynamodb.Table(table_name)
        
        # Check if rating already exists to determine create vs update
        try:
            existing_response = table.get_item(
                Key={
                    'user_id': user_id,
                    'isbn': isbn
                }
            )
            is_update = 'Item' in existing_response
            
            if is_update:
                existing_created_at = existing_response['Item'].get('created_at', '')
            else:
                existing_created_at = None
                
        except Exception as e:
            logger.error(f"Error checking existing rating: {str(e)}")
            # Continue with upsert even if check fails
            is_update = False
            existing_created_at = None
        
        # Prepare item for upsert
        current_timestamp = datetime.utcnow().isoformat() + 'Z'
        
        item = {
            'user_id': user_id,
            'isbn': isbn,
            'rating': Decimal(str(rating)),
            'updated_at': current_timestamp
        }
        
        # Set created_at: use existing if updating, otherwise use current timestamp
        if is_update and existing_created_at:
            item['created_at'] = existing_created_at
        else:
            item['created_at'] = current_timestamp
        
        # Upsert the rating
        try:
            table.put_item(Item=item)
            
            # Prepare response
            message = "Rating updated successfully" if is_update else "Rating created successfully"
            result = {
                'message': message,
                'user_id': user_id,
                'isbn': isbn,
                'rating': rating,
                'created_at': item['created_at'],
                'updated_at': item['updated_at']
            }
            
            return create_success_response(result)
            
        except Exception as e:
            logger.error(f"Error upserting rating: {str(e)}")
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

