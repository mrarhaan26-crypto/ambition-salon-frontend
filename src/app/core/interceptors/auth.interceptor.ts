import { HttpInterceptorFn } from '@angular/common/http';
export const authInterceptor: HttpInterceptorFn=(req,next)=>{const token=localStorage.getItem('ambition_access_token');return token?next(req.clone({setHeaders:{Authorization:`Bearer ${token}`}})):next(req);};
