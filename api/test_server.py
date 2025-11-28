#!/usr/bin/env python3
"""Test script to check if FastAPI dependencies work"""

try:
    print("Testing FastAPI imports...")
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    print("✅ FastAPI imports successful")
    
    print("Testing RestrictedPython imports...")
    from RestrictedPython import compile_restricted, safe_globals
    print("✅ RestrictedPython imports successful")
    
    print("Testing other dependencies...")
    import uvicorn
    import asyncio
    import json
    print("✅ All dependencies available")
    
    print("Creating basic FastAPI app...")
    app = FastAPI()
    
    @app.get("/test")
    def test_endpoint():
        return {"status": "FastAPI server working!"}
    
    print("✅ FastAPI app created successfully")
    print("🚀 All tests passed! Server should start normally.")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Run: pip install -r requirements.txt")
except Exception as e:
    print(f"❌ Error: {e}")