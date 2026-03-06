"""
Configuration de l'application Plex Preroll Manager.
Charge les variables d'environnement via pydantic-settings.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Paramètres de l'application chargés depuis les variables d'environnement.

    :param plex_url: URL du serveur Plex (accessible depuis le container)
    :param plex_token: Token d'authentification Plex (depuis global.env)
    :param preroll_dir: Chemin du dossier de scan À L'INTÉRIEUR du container
                        (côté droit du volume Docker, ex: /data/prerolls)
    :param plex_preroll_path: Chemin du même dossier VU PAR PLEX sur l'hôte
                              (côté gauche du volume Docker, ex: /home/monsieurz/library/intro)
                              Ces deux variables pointent vers le même dossier physique
                              mais depuis deux espaces distincts (container vs hôte).
    :param config_path: Chemin du fichier de persistance JSON (dans le container)
    """

    plex_url: str
    plex_token: str = ""
    preroll_dir: str = "/prerolls"
    plex_preroll_path: str
    config_path: str = "/data/config.json"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
