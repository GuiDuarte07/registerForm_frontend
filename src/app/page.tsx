'use client'

import BasicDatePicker from '@/components/BasicDatePicker'
import { cepMask, cpfMask, phoneNumberMask } from '@/utils/mask'

import {
  Button,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  Radio,
  RadioGroup,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
} from '@mui/material'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import Visibility from '@mui/icons-material/Visibility'
import { useEffect, useRef, useState } from 'react'
import { Controller, type SubmitHandler, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import dayjs from 'dayjs'
import { ICepAddressUtil, ICepSetValues, getCepData } from '@/utils/getCep'

const steps = ['Dados Pessoas', 'Endereço', 'Informações de acesso']

const schemaForm = z
  .object({
    personal: z.object({
      firstName: z
        .string()
        .min(4, 'Insira um nome válido')
        .regex(/[\p{Letter}\s]+/gu, 'Só pode conter letras'),
      lastName: z
        .string()
        .min(4, 'Insira um nome válido')
        .regex(/[\p{Letter}\s]+/gu, 'Só pode conter letras'),
      phone: z
        .string()
        .refine((arg) => phoneNumberMask(arg).isComplete as boolean, { message: 'O número precisa ser válido' }),
      cpf: z.string().refine((arg) => cpfMask(arg).isComplete as boolean, { message: 'O CPF precisa ser válido' }),
      bornDate: z.any().transform((arg) => dayjs(arg).format('DD/MM/YYYY')),
      gender: z.enum(['male', 'female', 'other']),
    }),
    address: z.object({
      cep: z.string().refine((arg) => cepMask(arg).isComplete as boolean, { message: 'O cep precisa ser válido' }),
      city: z.string().min(3, 'Tamanho minimo desse campo e 3').max(60, 'Quantidade de digitos ultrapassou o limite'),
      uf: z.string().length(2, 'Insira uma UF valida'),
      district: z
        .string()
        .min(3, 'Tamanho minimo desse campo e 2')
        .max(60, 'Quantidade de digitos ultrapassou o limite'),
      street: z.string().min(3, 'Tamanho minimo desse campo e 2').max(60, 'Quantidade de digitos ultrapassou o limite'),
      streetNumber: z.string().regex(/^\d+$/, 'Só pode conter números'),
      complement: z.string().max(60, 'Quantidade de digitos ultrapassou o limite').optional(),
    }),
    account: z.object({
      email: z.string().email('Insira um e-mail válido'),
      password: z.string(),
      passwordConfirm: z.string(),
    }),
  })
  .refine((data) => data.account.password === data.account.passwordConfirm, {
    message: 'As senhas não conferem',
    path: ['account.passwordConfirm'],
  })

type FormProps = z.infer<typeof schemaForm>

const stepToFormProp: ['personal', 'address', 'account'] = ['personal', 'address', 'account']

export default function Home(): JSX.Element {
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormProps>({ resolver: zodResolver(schemaForm) })


  /* 
    Como telefone, cpf e cep leva uma máscara, usamos o watch do react hook form para ter um controle desses campos em tempo
    de digitação, assim, podemos usar o setValue para colocar a máscara neles em toda key press.
  */
  const phoneValue = watch('personal.phone')
  const cpfValue = watch('personal.cpf')
  const cepValue = watch('address.cep')

  /*  
    Para não sobrecarregar a API do cep, criei essa ref para armazenar os dados de ceps já preenchidos e não ter que
    consultar a API novamente, funcionando como um cache.
  */
  const cepsCache = useRef<ICepAddressUtil[]>([])

  const setAddressValues = ({ localidade, bairro, logradouro, complemento, uf }: ICepSetValues) => {
    setValue('address.city', localidade ?? '')
    setValue('address.district', bairro ?? '')
    setValue('address.street', logradouro ?? '')
    setValue('address.complement', complemento ?? '')
    setValue('address.uf', uf ?? '')
  }

  useEffect(() => {
    if (phoneValue) setValue('personal.phone', phoneNumberMask(phoneValue).value)
  }, [phoneValue])

  useEffect(() => {
    if (cpfValue) setValue('personal.cpf', cpfMask(cpfValue).value)
  }, [cpfValue])

  /* 
    Esse useEffect é especial porque ele vai ficar escutando se o campo cep for preenchido totalmente e executar o fetch para
    a API do cep e preenchimento dos campos de endereço, junto com a lógica de cache de ceps já preenchidos.
  */
  useEffect(() => {
    if (!cepValue) return
    const cepMasked: any = cepMask(cepValue)

    const unmaskedCep: string = cepMasked.unmaskedValue
    const maskedCep: string = cepMasked.value

    setValue('address.cep', maskedCep)

    if (cepMasked.isComplete) {
      const cepAlreadyExist = cepsCache.current.find(({cep}) => cep === maskedCep);
      if (cepAlreadyExist) {
        setAddressValues(cepAlreadyExist)
        return
      }

      getCepData(unmaskedCep).then((address) => {
        const { bairro, localidade, logradouro, complemento, uf } = address

        setAddressValues(address)

        cepsCache.current.push({ cep: maskedCep, bairro, localidade, logradouro, complemento, uf })
      })
    }
  }, [cepValue])
  
  // Esse useState é para controlar o elemento Stepper do MUI
  const [activeStep, setActiveStep] = useState(1)

  const [showPassword, setShowPassword] = useState(false)

  const onSubmitError = (): void => {
    /* 
      Quando der erro no submit existe duas possibilidades:
      1. Não é a ultima página do formulario, pois a forma como foi programado o submit, quando clica em próximo
      para seguir o prenchimento do formulário, todos os campos são validados, incluindo os que não foram preenchidos
      ainda, nesse caso, só verificamos o erro daquela página para trás e seguimos para a próxima caso não tenha.
      2. Algum campo da ultima página do formulário está incorreta.
    */
    if (errors[stepToFormProp[activeStep]] !== undefined) return

    if (activeStep !== 2) handleNextActiveStep()
  }

  const onSubmit: SubmitHandler<FormProps> = (data) => {
    // If apenas para prevenção de bugs
    if (activeStep !== 2) {
      handleNextActiveStep()
      return
    }
    alert('Recebemos seus dados!')
    console.log(data)
  }

  const handleNextActiveStep = (): void => {
    setActiveStep((state) => state + 1)
  }

  const handlePrevActiveStep = (): void => {
    setActiveStep((state) => state - 1)
  }

  return (
    <Grid container className='p-2 bg-white flex justify-center items-center h-screen'>
      <Stack className='border-gray-500 border flex' direction='column' columnGap={1}>
        <h1>Cadastre-se na nossa plataforma</h1>

        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <form className='flex gap-2 flex-col my-8' onSubmit={handleSubmit(onSubmit, onSubmitError)}>
          {activeStep === 0 && (
            <>
              <Controller
                name='personal.firstName'
                control={control}
                defaultValue=''
                render={({ field }) => (
                  <TextField
                    {...field}
                    id='outlined-basic'
                    error={errors?.personal?.firstName !== undefined}
                    helperText={errors?.personal?.firstName?.message ?? ''}
                    label='Nome'
                    variant='outlined'
                    required
                  />
                )}
              />
              <Controller
                name='personal.lastName'
                control={control}
                defaultValue=''
                render={({ field }) => (
                  <TextField
                    {...field}
                    error={errors?.personal?.lastName !== undefined}
                    helperText={errors?.personal?.lastName?.message ?? ''}
                    id='outlined-basic'
                    label='Sobrenome'
                    variant='outlined'
                    required
                  />
                )}
              />

              <Controller
                name='personal.phone'
                control={control}
                defaultValue=''
                render={({ field }) => (
                  <TextField
                    {...field}
                    variant='outlined'
                    id='outlined-require'
                    label='Telefone'
                    error={errors?.personal?.phone !== undefined}
                    helperText={errors?.personal?.phone?.message ?? ''}
                    required
                  />
                )}
              />

              <Controller
                name='personal.cpf'
                control={control}
                defaultValue=''
                render={({ field }) => (
                  <TextField
                    {...field}
                    id='outlined-basic'
                    label='CPF'
                    variant='outlined'
                    error={errors?.personal?.cpf !== undefined}
                    helperText={errors?.personal?.cpf?.message ?? ''}
                    required
                  />
                )}
              />

              <Controller
                name='personal.bornDate'
                control={control}
                defaultValue={null}
                render={({ field }) => <BasicDatePicker fields={field} />}
              />

              <FormControl>
                <FormLabel id='demo-radio-buttons-group-label'>Gênero</FormLabel>
                <Controller
                  name='personal.gender'
                  control={control}
                  defaultValue='male'
                  render={({ field }) => (
                    <RadioGroup
                      {...field}
                      row
                      aria-labelledby='demo-radio-buttons-group-label'
                      defaultValue='male'
                      name='radio-buttons-group'
                    >
                      <FormControlLabel value='female' control={<Radio />} label='Feminino' />
                      <FormControlLabel value='male' control={<Radio />} label='Masculino' />
                      <FormControlLabel value='other' control={<Radio />} label='Outro' />
                    </RadioGroup>
                  )}
                />
              </FormControl>
            </>
          )}

          {activeStep === 1 && (
            <>
              <Controller
                name='address.cep'
                control={control}
                defaultValue=''
                render={({ field }) => (
                  <TextField
                    {...field}
                    error={errors?.address?.cep !== undefined}
                    helperText={errors?.address?.cep?.message ?? ''}
                    id='outlined-basic'
                    label='CEP'
                    variant='outlined'
                    required
                  />
                )}
              />
              <Controller
                name='address.city'
                control={control}
                defaultValue=''
                render={({ field }) => (
                  <TextField
                    {...field}
                    error={errors?.address?.city !== undefined}
                    helperText={errors?.address?.city?.message ?? ''}
                    id='outlined-basic'
                    label='Cidade'
                    variant='outlined'
                    required
                  />
                )}
              />
              <Controller
                name='address.uf'
                control={control}
                defaultValue=''
                render={({ field }) => (
                  <TextField
                    {...field}
                    error={errors?.address?.uf !== undefined}
                    helperText={errors?.address?.uf?.message ?? ''}
                    id='outlined-basic'
                    label='UF'
                    variant='outlined'
                    required
                  />
                )}
              />
              <Controller
                name='address.district'
                control={control}
                defaultValue=''
                render={({ field }) => (
                  <TextField
                    {...field}
                    error={errors?.address?.district !== undefined}
                    helperText={errors?.address?.district?.message ?? ''}
                    id='outlined-basic'
                    label='Bairro'
                    variant='outlined'
                    required
                  />
                )}
              />
              <Controller
                name='address.street'
                control={control}
                defaultValue=''
                render={({ field }) => (
                  <TextField
                    {...field}
                    error={errors?.address?.street !== undefined}
                    helperText={errors?.address?.street?.message ?? ''}
                    id='outlined-basic'
                    label='Rua'
                    variant='outlined'
                    required
                  />
                )}
              />
              <Controller
                name='address.streetNumber'
                control={control}
                defaultValue=''
                render={({ field }) => (
                  <TextField
                    {...field}
                    error={errors?.address?.streetNumber !== undefined}
                    helperText={errors?.address?.streetNumber?.message ?? ''}
                    id='outlined-basic'
                    label='Número'
                    variant='outlined'
                    required
                  />
                )}
              />
              <Controller
                name='address.complement'
                control={control}
                defaultValue=''
                render={({ field }) => (
                  <TextField
                    {...field}
                    error={errors?.address?.complement !== undefined}
                    helperText={errors?.address?.complement?.message ?? ''}
                    id='outlined-basic'
                    label='Complemento'
                    variant='outlined'
                  />
                )}
              />
            </>
          )}

          {activeStep === 2 && (
            <>
              <Controller
                name='account.email'
                control={control}
                defaultValue=''
                render={({ field }) => (
                  <TextField
                    {...field}
                    error={errors?.account?.email !== undefined}
                    helperText={errors?.account?.email?.message ?? ''}
                    id='outlined-basic'
                    label='E-mail'
                    variant='outlined'
                    required
                    type='email'
                  />
                )}
              />

              <FormControl variant='outlined'>
                <InputLabel htmlFor='outlined-adornment-password'>Senha *</InputLabel>
                <Controller
                  name='account.password'
                  control={control}
                  defaultValue=''
                  render={({ field }) => (
                    <OutlinedInput
                      required
                      {...field}
                      id='outlined-adornment-password'
                      type={showPassword ? 'text' : 'password'}
                      endAdornment={
                        <InputAdornment position='end'>
                          <IconButton
                            aria-label='toggle password visibility'
                            onClick={() => {
                              setShowPassword((state) => !state)
                            }}
                            edge='end'
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      }
                      label='Password'
                    />
                  )}
                />
              </FormControl>

              <FormControl variant='outlined'>
                <InputLabel htmlFor='outlined-adornment-password-confirm'>Confirmar senha *</InputLabel>

                <Controller
                  name='account.passwordConfirm'
                  control={control}
                  defaultValue=''
                  render={({ field }) => (
                    <OutlinedInput
                      required
                      {...field}
                      id='outlined-adornment-password-confirm'
                      type={showPassword ? 'text' : 'password'}
                      endAdornment={
                        <InputAdornment position='end'>
                          <IconButton
                            aria-label='toggle password visibility'
                            onClick={() => {
                              setShowPassword((state) => !state)
                            }}
                            edge='end'
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      }
                      label='Password'
                    />
                  )}
                />
              </FormControl>

              <FormHelperText
                error={errors?.account?.password === undefined ? true : errors?.account?.passwordConfirm !== undefined}
              >
                {errors?.account?.password?.message ?? errors?.account?.passwordConfirm?.message ?? ''}
              </FormHelperText>
            </>
          )}

          <div className='flex gap-8 justify-end'>
            {activeStep !== 0 && <Button onClick={handlePrevActiveStep}>Voltar</Button>}
            <Button type='submit'>{activeStep === steps.length - 1 ? 'Finalizar' : 'Proximo'}</Button>
          </div>
        </form>
      </Stack>
    </Grid>
  )
}
