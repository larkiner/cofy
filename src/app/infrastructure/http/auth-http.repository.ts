import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthResponse, LoginRequest, RegistroRequest } from '../../domain/auth/auth.model';
import { AuthRepository } from '../../domain/auth/auth.repository';
import { environment } from '../../../environments/environment';

/** Adaptador: autenticación contra el backend Spring Boot. */
@Injectable()
export class AuthHttpRepository extends AuthRepository {
  private readonly http = inject(HttpClient);

  registrar(datos: RegistroRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/registro`, datos);
  }

  login(datos: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, datos);
  }
}
