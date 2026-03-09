from .base import MTProvider
from typing import List, Dict, Any
import asyncio

class DummyMTProvider(MTProvider):
    """Dummy provider for testing."""
    async def translate(
        self, texts: List[str], source_lang: str, target_lang: str, context: Dict[str, Any]
    ) -> List[str]:
        # Simulate network latency
        await asyncio.sleep(1)

        results = []
        for t in texts:
            results.append(f"[DUMMY] Translated {t}")

        return results
