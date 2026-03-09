from abc import ABC, abstractmethod
from typing import List, Dict, Any

class MTProvider(ABC):
    """Abstract base class for Machine Translation Providers."""
    @abstractmethod
    async def translate(
        self, texts: List[str], source_lang: str, target_lang: str, context: Dict[str, Any]
    ) -> List[str]:
        """Translate a batch of texts."""
        pass
