import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { forkJoin, Subscription } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ShareModalComponent } from '../../shared/component/share-modal/share-modal.component';
import { MovieDatabaseModel } from '../../shared/model/movie-database.model';
import { DatabaseService } from '../../shared/service/database/database.service';
import { StorageService } from '../../shared/service/storage/storage.service';
import { TmdbService } from '../../shared/service/tmdb/tmdb.service';
import { MovieCastModel } from '../shared/movie-cast.model';
import { MovieCrewModel } from '../shared/movie-crew.model';
import { MovieDetailsModel } from '../shared/movie-details.model';
import { MovieModel } from '../shared/movie.model';
import { MovieTrailerComponent } from './movie-trailer/movie-trailer.component';
@Component({
  selector: 'app-movie',
  templateUrl: './movie.component.html',
  styleUrls: ['./movie.component.scss']
})
export class MovieComponent implements OnInit {
  id: number;
  url: string;
  movie: MovieDetailsModel;
  moviesUrl: Array<SafeResourceUrl>;
  videos: Array<any>;
  similarMovies: MovieModel[];
  cast: MovieCastModel[];
  crew: MovieCrewModel[];
  isConnected = false;
  baseUrl = 'https://www.youtube.com/embed/';
  safeUrl: any;
  SWIPE_ACTION = { LEFT: 'swipeleft', RIGHT: 'swiperight' };
  isLoadingResults: boolean;
  sub: Subscription;
  getCategories: Array<any>;
  categories = [];
  lang: string;
  recommendedMovies: MovieModel[];
  moviePredictions: MovieModel[];

  constructor(
    public authService: AuthService,
    private databaseService: DatabaseService,
    public dialog: MatDialog,
    private location: Location,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private snackBar: MatSnackBar,
    private tmdbService: TmdbService,
    private storageService: StorageService,
    private translateService: TranslateService
  ) { }

  ngOnInit() {
    this.isLoadingResults = true;
    this.lang = this.storageService.read('language');

    this.route.paramMap.subscribe((params: ParamMap) => {
      this.id = +params.get('id');
      const dataMovie = this.tmdbService.getDetailsMovie(this.id, this.lang);
      const castMovie = this.tmdbService.getCastMovie(this.id);
      const videoMovie = this.tmdbService.getVideoMovie(this.id, this.lang);
      const similarVideo = this.tmdbService.getSimilarMovies(this.id, this.lang);

      forkJoin(dataMovie, castMovie, videoMovie, similarVideo).subscribe(([movie, credits, video, similar]) => {
        this.isLoadingResults = false;
        this.movie = movie;
        this.cast = credits.cast;
        this.videos = video.results;
        this.getUrlFromVideos(this.videos);
        this.similarMovies = similar.results;

        this.getModelRecommendation(this.movie.title);
        this.getModelPredictions(this.movie.title);
      });
    });
  }


  getModelPredictions(moveiTitle: String) {
    this.tmdbService.getPredictions(moveiTitle).subscribe(response => {

      let movies = [];
        console.log(response);
        for (let item in response) {
          // console.log(response[item]['id']);
          this.tmdbService.getDetailsMovie(response[item]['id'], 'en-US').subscribe(res => {
            res.estimatedRating = Math.round(response[item]['estimatedRating']*100)/100;
            movies.push(res);
            if(response.length == movies.length) {
              this.moviePredictions = movies;
              console.log(this.moviePredictions);
            }
          });
        }

    }, error => {
      this.moviePredictions = [];
    });
  }

  getModelRecommendation(moveiTitle: String) {
    this.tmdbService.getRecommended(moveiTitle).subscribe(response => {

      let movies = [];
        // console.log(response);
        for (let item in response) {
          // console.log(response[item]['id']);
          this.tmdbService.getDetailsMovie(response[item]['id'], 'en-US').subscribe(res => {
            movies.push(res);
            if(response.length == movies.length) {
              this.recommendedMovies = movies;
            }
          });
        }

    }, error => {
      this.recommendedMovies = [];
    });
  }

  back() {
    this.location.back();
  }

  getAllCategories() {
    this.sub = this.databaseService.getAllCategoriesUser().subscribe(response => {
      this.getCategories = response;
      this.categories = this.getCategories.map(value => value.name);
    });
  }

  swipe(action = this.SWIPE_ACTION.RIGHT) {
    if (action === this.SWIPE_ACTION.RIGHT || action === this.SWIPE_ACTION.LEFT) {
      this.location.back();
    }
  }

  pushMovieCategoryDefault(movie: MovieDatabaseModel, category: string) {
    this.databaseService.addMovieCategoriesDefault(movie, category, (error) => {
      if (error) {
        this.snackBar.open(error, 'Hide', { duration: 5000 });
      } else {
        this.translateService.get('Error.Movie-added').subscribe(results => this.snackBar.open(results, '', { duration: 2000 }));
      }
    });
  }

  getUrlFromVideos(videos: any) {
    if (!videos || videos.length === 0) {
      return;
    }
    this.moviesUrl = [];
    for (const video of videos) {
      const url = this.createUrlFromVideo(video.key);
      this.moviesUrl.push({
        name: video.name,
        url
      });
    }
  }

  createUrlFromVideo(id: string) {
    return this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`${this.baseUrl}/${id}?rel=0;&autoplay=1&mute=1`);
  }

  pushMovieCategory(movie: any, category: string) {
    this.databaseService.addMovieCategory(movie, category, (error) => {
      if (error) {
        this.snackBar.open(error, 'Hide', { duration: 5000 });
      } else {
        this.translateService.get('Error.Movie-added').subscribe(results => this.snackBar.open(results, '', { duration: 2000 }));
      }
    });
  }

  shareDialog(movie: MovieDatabaseModel): void {
    this.dialog.open(ShareModalComponent, {
      data: { id: movie.id, original_title: movie.original_title }
    });
  }

  openDialogTrailer(url: any): void {
    const dialogRef = this.dialog.open(MovieTrailerComponent, {
      height: '400px',
      width: '600px',
      data: {url}
    });
  }

}
