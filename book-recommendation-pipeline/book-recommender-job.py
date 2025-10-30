import sys
import os
import sklearn
import numpy as np
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from pyspark.sql import SparkSession
from pyspark.ml.recommendation import ALS
from pyspark.ml.feature import StringIndexer
from pyspark.sql.functions import when, col, count
from sklearn.metrics.pairwise import cosine_similarity
from pyspark.ml.evaluation import RegressionEvaluator
from awsglue.dynamicframe import DynamicFrame

## @params: [JOB_NAME]
args = getResolvedOptions(sys.argv, ['JOB_NAME'])

sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

S3_INPUT_PATH = "s3://book-recommender-raw-data/"

# Read data from S3
books = spark.read.csv(f"{S3_INPUT_PATH}/Books.csv", sep=',', header=True, inferSchema=True, escape='"')
ratings = spark.read.csv(f"{S3_INPUT_PATH}/Ratings.csv", sep=',', header=True, inferSchema=True, escape='"')

print("Data loaded")
# Rename columns to remove hyphens
ratings = ratings.withColumnRenamed("User-ID", "UserID") \
                 .withColumnRenamed("Book-Rating", "BookRating")

books = books.withColumnRenamed("Book-Title", "BookTitle") \
             .withColumnRenamed("Book-Author", "BookAuthor") \
             .withColumnRenamed("Year-Of-Publication", "YearOfPublication") \
             .withColumnRenamed("Image-URL-S", "ImageURLSmall") \
             .withColumnRenamed("Image-URL-M", "ImageURLMedium") \
             .withColumnRenamed("Image-URL-L", "ImageURLLarge")

# Explore the data
print("\n=== DATA EXPLORATION ===")
print("Books schema:")
books.printSchema()
print("\nRatings schema:")
ratings.printSchema()

print("\nSample books:")
books.show(5, truncate=False)
print("\nSample ratings:")
ratings.show(5)

print(f"\nTotal books: {books.count()}")
print(f"Total ratings: {ratings.count()}")

print("\n=== DATA PREPROCESSING ===")
# Filter out ratings of 0 (implicit feedback) - keep only explicit ratings
ratings_filtered = ratings.filter(col('BookRating') > 0)
print(f"Ratings after filtering (BookRating > 0): {ratings_filtered.count()}")

# Filter users and books with minimum ratings
min_ratings_per_user = 5
min_ratings_per_book = 5

user_counts = ratings_filtered.groupBy('UserID').agg(count('*').alias('user_rating_count'))
book_counts = ratings_filtered.groupBy('ISBN').agg(count('*').alias('book_rating_count'))

# Join and filter with proper column selection
ratings_filtered = ratings_filtered.alias('r') \
    .join(user_counts.alias('uc'), col('r.UserID') == col('uc.UserID')) \
    .filter(col('user_rating_count') >= min_ratings_per_user) \
    .select(col('r.UserID'), col('r.ISBN'), col('r.BookRating'))

ratings_filtered = ratings_filtered.alias('r') \
    .join(book_counts.alias('bc'), col('r.ISBN') == col('bc.ISBN')) \
    .filter(col('book_rating_count') >= min_ratings_per_book) \
    .select(col('r.UserID'), col('r.ISBN'), col('r.BookRating'))

print(f"\nRatings after quality filtering: {ratings_filtered.count()}")

# Create user and item indices (ALS needs integer IDs)
print("\n=== CREATING INDICES ===")

user_indexer = StringIndexer(inputCol="UserID", outputCol="userIndex")
book_indexer = StringIndexer(inputCol="ISBN", outputCol="bookIndex")

# Fit and transform
ratings_indexed = user_indexer.fit(ratings_filtered).transform(ratings_filtered)
ratings_indexed = book_indexer.fit(ratings_indexed).transform(ratings_indexed)

print("Sample indexed ratings:")
ratings_indexed.select('UserID', 'userIndex', 'ISBN', 'bookIndex', 'BookRating').show(10)

# Split data into training and test sets
print("\n=== SPLITTING DATA ===")
(training, test) = ratings_indexed.randomSplit([0.8, 0.2], seed=42)

print(f"Training set: {training.count()} ratings")
print(f"Test set: {test.count()} ratings")

# Build and train the ALS model
als = ALS(
    maxIter=10,
    regParam=0.1,
    rank=10,
    userCol="userIndex",
    itemCol="bookIndex",
    ratingCol="BookRating",
    coldStartStrategy="drop",
    nonnegative=True
)

model = als.fit(training)
print("Model training complete")
print("\n=== GENERATING BOOK SIMILARITIES ===")

# Get item factors (books)
item_factors = model.itemFactors

print(f"Total items with factors: {item_factors.count()}")

# Get mappings
book_mapping_with_index = ratings_indexed.select('ISBN', 'bookIndex').distinct() \
    .join(books, 'ISBN') \
    .select('ISBN', 'bookIndex', 'BookTitle', 'BookAuthor', 'YearOfPublication', 'Publisher', 'ImageURLSmall', 'ImageURLMedium')

book_mapping_pd = book_mapping_with_index.toPandas()
item_factors_pd = item_factors.toPandas()

print("Computing book similarities...")

# Prepare feature matrix
item_features_matrix = np.vstack(item_factors_pd['features'].values)
print(f"Item features matrix shape: {item_features_matrix.shape}")

# Compute cosine similarity matrix
print("Computing cosine similarity matrix...")
similarity_matrix = cosine_similarity(item_features_matrix)
print(f"Similarity matrix shape: {similarity_matrix.shape}")

# Extract top 20 similar books for each book
similarity_list = []
top_n_similar = 20

print(f"Extracting top-{top_n_similar} similar books...")

for item_idx in range(len(item_factors_pd)):
    item_id_internal = item_factors_pd.iloc[item_idx]['id']

    # Get book info
    book_match = book_mapping_pd[book_mapping_pd['bookIndex'] == item_id_internal]
    if len(book_match) == 0:
        continue

    book_info = book_match.iloc[0]

    # Get top N similar books excluding itself
    similarities = similarity_matrix[item_idx]
    similar_indices = np.argsort(similarities)[::-1][1:top_n_similar+1]

    for rank, similar_idx in enumerate(similar_indices, 1):
        similar_item_id = item_factors_pd.iloc[similar_idx]['id']
        similarity_score = similarities[similar_idx]

        # Get similar book info
        similar_book_match = book_mapping_pd[book_mapping_pd['bookIndex'] == similar_item_id]
        if len(similar_book_match) == 0:
            continue

        similar_book = similar_book_match.iloc[0]

        similarity_list.append({
            'isbn': book_info['ISBN'],
            'title': book_info['BookTitle'],
            'author': book_info['BookAuthor'],
            'similar_isbn': similar_book['ISBN'],
            'similar_title': similar_book['BookTitle'],
            'similar_author': similar_book['BookAuthor'],
            'similarity_score': float(similarity_score),
            'rank': rank
        })

    if (item_idx + 1) % 1000 == 0:
        print(f"Progress: {item_idx + 1}/{len(item_factors_pd)} books")

# Convert to Spark DataFrame
similarities_df = spark.createDataFrame(similarity_list)

print(f"Generated {similarities_df.count()} similarity records")

print("\nSample similarities:")
similarities_df.show(10)


#Write book metadata to DynamoDB
book_metadata_for_ddb = book_mapping_with_index.select(
    col('ISBN').alias('isbn'),
    col('BookTitle').alias('title'),
    col('BookAuthor').alias('author'),
    col('YearOfPublication').alias('year'),
    col('Publisher').alias('publisher'),
    col('ImageURLSmall').alias('image_url_small'),
    col('ImageURLMedium').alias('image_url_medium')
)

book_metadata_dyf = DynamicFrame.fromDF(book_metadata_for_ddb, glueContext, "book_metadata_dyf")

glueContext.write_dynamic_frame_from_options(
    frame=book_metadata_dyf,
    connection_type="dynamodb",
    connection_options={
        "dynamodb.output.tableName": "Books",
        "dynamodb.throughput.write.percent": "0.2"
    }
)


print("Book metadata written to DynamoDB successfully!")

# Write book similarities to DynamoDB
print("\nWriting book similarities to DynamoDB...")

similarities_dyf = DynamicFrame.fromDF(similarities_df, glueContext, "similarities_dyf")

glueContext.write_dynamic_frame_from_options(
    frame=similarities_dyf,
    connection_type="dynamodb",
    connection_options={
        "dynamodb.output.tableName": "BookSimilarities", 
        "dynamodb.throughput.write.percent": "0.2"
    }
)

print("Book similarities written to DynamoDB successfully!")

print("\n=== PROCESSING COMPLETE ===")

job.commit()