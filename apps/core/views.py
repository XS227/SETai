from django.shortcuts import render


def home(request):
    return render(request, "base.html")


def showcase(request):
    return render(request, "showcase.html")
