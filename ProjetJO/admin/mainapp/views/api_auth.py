from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import login, logout, authenticate  # Ajout de l'import authenticate
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.contrib.auth.password_validation import validate_password

@api_view(['POST'])
def register_user(request):
    try:
        data = request.data
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')

        if User.objects.filter(username=username).exists():
            return Response(
                {"message": "Ce nom d'utilisateur est déjà pris"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Valider le mot de passe
        try:
            validate_password(password)
        except ValidationError as e:
            return Response(
                {"message": str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Créer l'utilisateur
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )

        return Response(
            {"message": "Inscription réussie"}, 
            status=status.HTTP_201_CREATED
        )

    except Exception as e:
        return Response(
            {"message": str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )

@api_view(['POST'])
def login_user(request):
    try:
        username = request.data.get('username')
        password = request.data.get('password')

        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            return Response({
                "status": "success",
                "message": "Connexion réussie",
                "user": {
                    "username": user.username,
                    "email": user.email
                }
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "status": "error",
                "message": "Identifiants invalides"
            }, status=status.HTTP_401_UNAUTHORIZED)

    except Exception as e:
        return Response({
            "status": "error",
            "message": f"Erreur lors de la connexion: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):
    logout(request)
    return Response({"message": "Déconnexion réussie"})